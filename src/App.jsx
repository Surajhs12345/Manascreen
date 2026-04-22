import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg:"#fdf8f4", card:"#ffffff", border:"#f0e6da",
  sage:"#6b9e82",   sageLight:"#e8f4ed",
  peach:"#e8845a",  peachLight:"#fdeee6",
  sky:"#5b8fc9",    skyLight:"#e8f0fa",
  amber:"#d4972a",  amberLight:"#fdf3dc",
  rose:"#c9606a",   roseLight:"#fce8ea",
  lavender:"#9b7fc9", lavenderLight:"#f0eafb",
  teal:"#4aabb0",   tealLight:"#e4f6f7",
  indigo:"#5c6bc0", indigoLight:"#e8eaf6",
  text:"#2d2420", textMid:"#6b5c54", textSoft:"#a08a7e", textMuted:"#c4b0a8",
  white:"#ffffff",
};
const FD = "'Lora', Georgia, serif";
const FB = "'Nunito', 'Segoe UI', sans-serif";

const SAVE_KEY      = "manascreen_progress_v2";
const HISTORY_KEY   = "manascreen_history_v1";
const MOODLOG_KEY   = "manascreen_moodlog_v1";
const JOURNAL_KEY   = "manascreen_journal_v1";
const PREFS_KEY     = "manascreen_prefs_v1";
const SAVE_EXPIRY_H = 24;

/* ─── Mood log definitions (Stage 1 / Feature 2) ────────────────── */
const MOODS = [
  {value:5,emoji:"😊",label:"Great",color:"#6b9e82"},
  {value:4,emoji:"🙂",label:"Okay",color:"#5b8fc9"},
  {value:3,emoji:"😐",label:"Meh",color:"#a08a7e"},
  {value:2,emoji:"😔",label:"Low",color:"#d4972a"},
  {value:1,emoji:"😢",label:"Heavy",color:"#c9606a"},
];

/* ─── Small storage helpers ─────────────────────────────────────── */
const storage = {
  get(key,fallback=null){
    try{
      const raw=window.localStorage?.getItem(key);
      return raw?JSON.parse(raw):fallback;
    }catch(e){return fallback;}
  },
  set(key,value){
    try{window.localStorage?.setItem(key,JSON.stringify(value));}catch(e){}
  },
  remove(key){
    try{window.localStorage?.removeItem(key);}catch(e){}
  },
};

/* ─── Haptics + sound hooks (Feature 5) ─────────────────────────── */
function tapHaptic(strength="light"){
  try{
    const map={light:15,medium:25,strong:[15,30,15]};
    if(navigator.vibrate) navigator.vibrate(map[strength]||15);
  }catch(e){}
}
// Soft chime generated on-demand — no external audio files needed
function playChime(type="soft"){
  try{
    const prefs=storage.get(PREFS_KEY,{sound:true});
    if(!prefs.sound) return;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC) return;
    const ctx=new AC();
    const freqs=type==="soft"?[523.25,659.25]:type==="complete"?[523.25,659.25,783.99]:[440];
    freqs.forEach((freq,i)=>{
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      osc.frequency.value=freq;
      osc.type="sine";
      const start=ctx.currentTime+i*0.08;
      gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(0.08,start+0.04);
      gain.gain.exponentialRampToValueAtTime(0.001,start+0.6);
      osc.start(start);
      osc.stop(start+0.6);
    });
    setTimeout(()=>{try{ctx.close();}catch(e){}},1200);
  }catch(e){}
}

/* ─── Encouragements ────────────────────────────────────────────── */
const ENCOURAGEMENTS = [
  "Thank you for sharing that 🌿","You're doing really well 💛",
  "That took courage — keep going 🌸","Every answer helps us understand you better ✨",
  "You're not alone in feeling this way 🤝","Almost there — you're doing great 🌼",
  "Thank you for being honest with yourself 💙","This is a brave step you're taking 🌱",
  "You matter, and so do your feelings 🧡",
];

/* ─── Clinical scales ───────────────────────────────────────────── */
const PHQ9 = [
  {q:"Having little interest or pleasure in doing things you used to enjoy",emoji:"😔",domain:"interest"},
  {q:"Feeling down, hopeless, or like things won't get better",emoji:"🌧️",domain:"mood"},
  {q:"Trouble falling asleep, staying asleep, or sleeping too much",emoji:"😴",domain:"sleep"},
  {q:"Feeling tired or having very little energy",emoji:"🪫",domain:"energy"},
  {q:"Not feeling hungry, or eating much more than usual",emoji:"🍽️",domain:"appetite"},
  {q:"Feeling bad about yourself, or like you've let people down",emoji:"💔",domain:"selfworth"},
  {q:"Difficulty focusing on reading, conversations, or daily tasks",emoji:"🌀",domain:"concentration"},
  {q:"Moving or speaking more slowly than usual — or feeling restless inside",emoji:"🐢",domain:"psychomotor"},
  {q:"Having thoughts of hurting yourself or that you'd be better off not here",emoji:"⚠️",domain:"safety",sensitive:true},
];
const GAD7 = [
  {q:"Feeling nervous, anxious, or on edge",emoji:"😰",domain:"nervousness"},
  {q:"Not being able to stop or control your worrying",emoji:"🌪️",domain:"worry-control"},
  {q:"Worrying too much about many different things at once",emoji:"💭",domain:"excessive-worry"},
  {q:"Finding it hard to relax, even when you have time to",emoji:"😤",domain:"relaxation"},
  {q:"Being so restless that it's hard to sit still",emoji:"⚡",domain:"restlessness"},
  {q:"Becoming easily annoyed or irritable with people around you",emoji:"😣",domain:"irritability"},
  {q:"Feeling afraid — like something awful might happen",emoji:"😨",domain:"apprehension"},
];
const FREQ4 = [
  {label:"Not at all",sub:"Hasn't happened",value:0,color:C.sage},
  {label:"A few days",sub:"Once in a while",value:1,color:C.sky},
  {label:"More than half the days",sub:"Quite often",value:2,color:C.amber},
  {label:"Nearly every day",sub:"Almost always",value:3,color:C.peach},
];

/* ─── PHQ-A (PHQ-9 Modified for Adolescents, Stage 3 / Feature 12) ── */
// Johnson, Harris, Spitzer & Williams 2002 — validated ages 11–17
// Same scoring as PHQ-9 (0-3 per item, total 0-27) with teen-friendly wording
const PHQA = [
  {q:"Feeling down, depressed, irritable, or hopeless?",emoji:"🌧️",domain:"mood"},
  {q:"Little interest or pleasure in doing things you usually enjoy?",emoji:"😔",domain:"interest"},
  {q:"Trouble falling asleep, staying asleep, or sleeping too much?",emoji:"😴",domain:"sleep"},
  {q:"Poor appetite, weight loss, or overeating?",emoji:"🍽️",domain:"appetite"},
  {q:"Feeling tired, or having little energy?",emoji:"🪫",domain:"energy"},
  {q:"Feeling bad about yourself — or feeling that you're a failure, or that you've let yourself or your family down?",emoji:"💔",domain:"selfworth"},
  {q:"Trouble concentrating on things like school work, reading, or watching TV?",emoji:"🌀",domain:"concentration"},
  {q:"Moving or speaking so slowly that other people could have noticed? Or being so fidgety or restless that you were moving around a lot more than usual?",emoji:"🐢",domain:"psychomotor"},
  {q:"Thoughts that you would be better off dead, or of hurting yourself in some way?",emoji:"⚠️",domain:"safety",sensitive:true},
];

/* ─── EPDS (Edinburgh Postnatal Depression Scale, Feature 13) ─────── */
// Cox, Holden & Sagovsky 1987 — for women in pregnancy or up to 12 months postpartum
// 10 items, each scored 0-3, total 0-30; score ≥13 = probable major depression
// Item 10 is a suicidality item and requires follow-up if endorsed
// Each item has custom response options in original order
const EPDS = [
  {q:"I have been able to laugh and see the funny side of things",emoji:"😊",
    options:[
      {label:"As much as I always could",value:0},
      {label:"Not quite so much now",value:1},
      {label:"Definitely not so much now",value:2},
      {label:"Not at all",value:3},
    ]},
  {q:"I have looked forward with enjoyment to things",emoji:"🌸",
    options:[
      {label:"As much as I ever did",value:0},
      {label:"Rather less than I used to",value:1},
      {label:"Definitely less than I used to",value:2},
      {label:"Hardly at all",value:3},
    ]},
  {q:"I have blamed myself unnecessarily when things went wrong",emoji:"💭",reverse:true,
    options:[
      {label:"Yes, most of the time",value:3},
      {label:"Yes, some of the time",value:2},
      {label:"Not very often",value:1},
      {label:"No, never",value:0},
    ]},
  {q:"I have been anxious or worried for no good reason",emoji:"🌪️",reverse:true,
    options:[
      {label:"No, not at all",value:0},
      {label:"Hardly ever",value:1},
      {label:"Yes, sometimes",value:2},
      {label:"Yes, very often",value:3},
    ]},
  {q:"I have felt scared or panicky for no very good reason",emoji:"😨",reverse:true,
    options:[
      {label:"Yes, quite a lot",value:3},
      {label:"Yes, sometimes",value:2},
      {label:"No, not much",value:1},
      {label:"No, not at all",value:0},
    ]},
  {q:"Things have been getting on top of me",emoji:"🫨",reverse:true,
    options:[
      {label:"Yes, most of the time I haven't been able to cope at all",value:3},
      {label:"Yes, sometimes I haven't been coping as well as usual",value:2},
      {label:"No, most of the time I have coped quite well",value:1},
      {label:"No, I have been coping as well as ever",value:0},
    ]},
  {q:"I have been so unhappy that I have had difficulty sleeping",emoji:"😴",reverse:true,
    options:[
      {label:"Yes, most of the time",value:3},
      {label:"Yes, sometimes",value:2},
      {label:"Not very often",value:1},
      {label:"No, not at all",value:0},
    ]},
  {q:"I have felt sad or miserable",emoji:"🌧️",reverse:true,
    options:[
      {label:"Yes, most of the time",value:3},
      {label:"Yes, quite often",value:2},
      {label:"Not very often",value:1},
      {label:"No, not at all",value:0},
    ]},
  {q:"I have been so unhappy that I have been crying",emoji:"💧",reverse:true,
    options:[
      {label:"Yes, most of the time",value:3},
      {label:"Yes, quite often",value:2},
      {label:"Only occasionally",value:1},
      {label:"No, never",value:0},
    ]},
  {q:"The thought of harming myself has occurred to me",emoji:"⚠️",sensitive:true,reverse:true,
    options:[
      {label:"Yes, quite often",value:3},
      {label:"Sometimes",value:2},
      {label:"Hardly ever",value:1},
      {label:"Never",value:0},
    ]},
];

const FREQ3 = [
  {label:"Not bothered at all",value:0,color:C.sage},
  {label:"Bothered a little",value:1,color:C.amber},
  {label:"Bothered a lot",value:2,color:C.peach},
];

const PHQ15 = [
  {q:"Stomach pain",emoji:"🫄"},{q:"Back pain",emoji:"🔙"},{q:"Pain in your arms, legs, or joints",emoji:"🦴"},
  {q:"Headaches",emoji:"🤕"},{q:"Chest pain or shortness of breath",emoji:"🫁"},{q:"Dizziness",emoji:"😵"},
  {q:"Feeling your heart pound or race",emoji:"💓"},{q:"Feeling tired or having low energy",emoji:"🪫"},
  {q:"Trouble sleeping",emoji:"😴"},{q:"Nausea, gas, or indigestion",emoji:"🤢"},
  {q:"Constipation, loose bowels, or diarrhoea",emoji:"🏃"},{q:"Pain or problems during sexual intercourse",emoji:"💔",sensitive:true},
  {q:"Feeling faint",emoji:"😶‍🌫️"},{q:"Numbness, tingling, or weakness in hands or feet",emoji:"🤲"},
  {q:"During your period, cramps or other problems (skip if not applicable)",emoji:"🌸"},
];

const MDQ_ITEMS = [
  "You felt so good or so hyper that other people thought you were not your normal self or you were so hyper that you got into trouble",
  "You were so irritable that you shouted at people or started fights or arguments",
  "You felt much more self-confident than usual",
  "You got much less sleep than usual and found you didn't really miss it",
  "You were much more talkative or spoke faster than usual",
  "Thoughts raced through your head or you couldn't slow your mind down",
  "You were so easily distracted that you had trouble concentrating",
  "You had much more energy than usual",
  "You were much more active or did many more things than usual",
  "You were much more social or outgoing than usual",
  "You were much more interested in sex than usual",
  "You did things that were unusual, excessive, foolish, or risky",
  "Spending money got you or your family into trouble",
];

const PCPTSD5 = [
  {q:"Had nightmares about a traumatic event or thought about it when you didn't want to",emoji:"😰"},
  {q:"Tried hard not to think about a traumatic event or went out of your way to avoid situations that reminded you of it",emoji:"🚫"},
  {q:"Been constantly on guard, watchful, or easily startled",emoji:"⚡"},
  {q:"Felt numb or detached from people, activities, or your surroundings",emoji:"😶"},
  {q:"Felt guilty or unable to stop blaming yourself or others for a traumatic event",emoji:"💔"},
];

const SLEEP_Qs = [
  {q:"How long does it usually take you to fall asleep?",emoji:"🌙",options:[{label:"Under 15 minutes",value:0},{label:"16–30 minutes",value:1},{label:"31–60 minutes",value:2},{label:"Over 60 minutes",value:3}]},
  {q:"How many hours of sleep do you actually get each night?",emoji:"⏰",options:[{label:"More than 7 hours",value:0},{label:"6–7 hours",value:1},{label:"5–6 hours",value:2},{label:"Less than 5 hours",value:3}]},
  {q:"How often do you wake up during the night and can't get back to sleep?",emoji:"😴",options:[{label:"Not in the past month",value:0},{label:"Less than once a week",value:1},{label:"Once or twice a week",value:2},{label:"Three or more times a week",value:3}]},
  {q:"How would you rate your overall sleep quality?",emoji:"⭐",options:[{label:"Very good",value:0},{label:"Fairly good",value:1},{label:"Fairly bad",value:2},{label:"Very bad",value:3}]},
];

const CSSRS = [
  {q:"Have you wished you were dead or wished you could go to sleep and not wake up?",level:1,emoji:"😶‍🌫️"},
  {q:"Have you had any actual thoughts of killing yourself?",level:2,emoji:"⚠️"},
  {q:"Have you been thinking about how you might do this?",level:3,emoji:"🚨"},
  {q:"Have you had any intention of acting on these thoughts?",level:4,emoji:"🆘"},
  {q:"Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?",level:5,emoji:"🆘"},
];

const PSYCHOSIS_Qs = [
  {q:"Have you ever heard voices or sounds that other people couldn't hear, or seen things that other people couldn't see?",emoji:"👂"},
  {q:"Have you ever felt that people were watching you, talking about you, or trying to harm you — without a clear reason?",emoji:"👁️"},
];

/* ─── Domain labels for PHQ-9 breakdown ─────────────────────────── */
const PHQ9_DOMAINS = {
  mood:         {label:"Mood",            icon:"🌧️", color:C.sky},
  interest:     {label:"Interest",         icon:"💭", color:C.lavender},
  sleep:        {label:"Sleep",            icon:"😴", color:C.indigo},
  energy:       {label:"Energy",           icon:"🪫", color:C.amber},
  appetite:     {label:"Appetite",         icon:"🍽️", color:C.teal},
  selfworth:    {label:"Self-worth",       icon:"💔", color:C.rose},
  concentration:{label:"Concentration",    icon:"🌀", color:C.peach},
  psychomotor:  {label:"Physical activity",icon:"🐢", color:C.sage},
  safety:       {label:"Safety",           icon:"💙", color:C.rose},
};

/* ─── Mood-affecting medications ────────────────────────────────── */
const MOOD_AFFECTING_MEDS = [
  {key:"isotretinoin",label:"Isotretinoin (Accutane, for acne)",note:"Well-documented association with depression and suicidal ideation",severity:"high"},
  {key:"steroids",label:"Steroids / corticosteroids (prednisolone, etc.)",note:"Can cause mood swings, depression, mania, psychosis — especially at high doses",severity:"high"},
  {key:"betablockers",label:"Beta blockers (propranolol, atenolol, metoprolol)",note:"Can cause fatigue and low mood; some patients experience depression",severity:"moderate"},
  {key:"hormonal",label:"Hormonal contraceptives",note:"Can affect mood in susceptible individuals",severity:"moderate"},
  {key:"interferon",label:"Interferon (hepatitis or MS treatment)",note:"Strongly associated with depression — monitoring required",severity:"high"},
  {key:"antiepileptic",label:"Anti-epileptic medications",note:"Some (levetiracetam, topiramate) can cause mood changes",severity:"moderate"},
  {key:"antimalarial",label:"Antimalarials (mefloquine)",note:"Known neuropsychiatric side effects",severity:"high"},
  {key:"thyroid",label:"Thyroid medications (if over/under-replaced)",note:"Incorrect dosing can mimic depression or anxiety",severity:"moderate"},
  {key:"other",label:"Other (I'm not sure / prefer to list)",note:"",severity:"low"},
];

/* ─── Clinical logic: differential, ICD, tier, med flags ────────── */
function buildClinicalImpression(data){
  const {phq9=0,gad7=0,phq15=0,mdq,trauma,psychosis,sleep,duration,medical,functional,safety,meds}=data;
  const functionalAvg=functional?Math.round(Object.values(functional).filter(v=>v!==null).reduce((a,b)=>a+b,0)/(Object.values(functional).filter(v=>v!==null).length||1)):0;
  const chronicity=["chronic","longterm"].includes(duration?.duration);
  const acute=["acute","subacute"].includes(duration?.duration);

  /* ── Primary impression ─────────────────────────────────────── */
  const diffs=[];
  let primary="",icd11="",dsm5="";
  const sev=phq9<=4?"minimal":phq9<=9?"mild":phq9<=14?"moderate":phq9<=19?"moderately severe":"severe";
  const anxSev=gad7<=4?"minimal":gad7<=9?"mild":gad7<=14?"moderate":"severe";

  if(mdq?.positive){
    primary=`Positive screen for bipolar spectrum, with current depressive features (${sev})`;
    icd11="6A60–6A61 (Bipolar type I/II, current depressive episode)";
    dsm5="Bipolar I/II Disorder, current depressive episode";
    diffs.push("Bipolar depression — requires mood stabiliser before antidepressant");
    diffs.push("Unipolar major depression with irritability");
    diffs.push("Substance/medication-induced mood disorder");
  } else if(phq9>=10 && gad7>=10){
    primary=`Mixed depressive and anxiety features (${sev} depression, ${anxSev} anxiety)`;
    icd11="6A70 (Depressive disorder) + 6B00 (Generalised anxiety disorder), OR 6A73 (Mixed depressive and anxiety disorder)";
    dsm5="Major Depressive Disorder + Generalised Anxiety Disorder (comorbid)";
    diffs.push("Primary MDD with comorbid GAD (most likely)");
    diffs.push("Primary anxiety disorder with secondary depression");
    diffs.push("Adjustment disorder with mixed features (if acute onset)");
    if(medical?.thyroid==="Yes") diffs.push("Thyroid dysfunction contributing to presentation — verify recent TFT");
  } else if(phq9>=10){
    primary=chronicity?`Persistent depressive features (${sev}) — likely MDD or persistent depressive disorder`:`${sev.charAt(0).toUpperCase()+sev.slice(1)} depressive episode`;
    icd11=chronicity?"6A71 (Dysthymic disorder) or 6A70 (Depressive disorder, recurrent)":"6A70 (Depressive disorder, single episode)";
    dsm5=chronicity?"Major Depressive Disorder (recurrent) or Persistent Depressive Disorder":"Major Depressive Disorder, single episode";
    diffs.push("Major depressive disorder (most likely)");
    if(chronicity) diffs.push("Persistent depressive disorder (dysthymia)");
    if(acute) diffs.push("Adjustment disorder with depressed mood");
    diffs.push("Bipolar depression — re-screen with MDQ if not done");
    if(medical?.thyroid==="Yes") diffs.push("Hypothyroidism-associated depression — verify TFT");
    if(medical?.substances==="Yes") diffs.push("Substance-induced mood disorder — assess AUDIT-C");
  } else if(gad7>=10){
    primary=`${anxSev.charAt(0).toUpperCase()+anxSev.slice(1)} anxiety presentation`;
    icd11="6B00 (Generalised anxiety disorder) — consider 6B01 (Panic disorder) if panic attacks";
    dsm5="Generalised Anxiety Disorder";
    diffs.push("Generalised anxiety disorder (most likely)");
    diffs.push("Panic disorder — ask about discrete panic attacks");
    diffs.push("Social anxiety disorder — if anxiety is situational");
    if(medical?.thyroid==="Yes") diffs.push("Hyperthyroidism-associated anxiety — verify TFT");
    if(trauma?.positive) diffs.push("PTSD-related hyperarousal");
  } else if(phq9>=5 || gad7>=5){
    primary=`Mild mixed symptoms — subthreshold for full diagnosis`;
    icd11="QD85 (Other specified symptoms) or MB24 (Other specified mental/behavioural symptoms)";
    dsm5="Other Specified Depressive Disorder or Adjustment Disorder";
    diffs.push("Adjustment disorder — most likely if stressor identified");
    diffs.push("Subthreshold depression or anxiety");
    diffs.push("Early presentation — may evolve; repeat in 2 weeks");
  } else {
    primary="No significant depressive or anxiety symptoms";
    icd11="Z00.0 (General medical examination) — no diagnosis";
    dsm5="No mental disorder on screening";
    diffs.push("Normal variation");
    diffs.push("Consider repeating if clinical suspicion persists");
  }

  if(trauma?.positive){
    diffs.push("Post-traumatic stress disorder — PC-PTSD-5 positive");
  }
  if(psychosis?.flag){
    diffs.push("Psychotic features — requires urgent psychiatric evaluation");
  }
  if(phq15>=10){
    diffs.push("Somatic symptom component — consider PHQ-15 elevation in formulation");
  }
  if(sleep?.poor){
    diffs.push("Primary sleep disorder — consider independent sleep evaluation");
  }

  /* ── Treatment intensity tier ───────────────────────────────── */
  const cssrsHigh=safety?.level>=3;
  const suicidalityAny=safety?.level>=1;
  const severeDep=phq9>=20;
  const severeAnx=gad7>=15;
  const highFunc=functionalAvg>=7;

  let tier={},tierDetail={};
  if(cssrsHigh||(severeDep&&suicidalityAny)||psychosis?.flag){
    tier={level:5,label:"Urgent care",color:C.rose,icon:"🚨"};
    tierDetail={
      action:"Same-day psychiatric evaluation",
      path:"Emergency department or crisis helpline today — do not wait",
      modality:"In-person psychiatric assessment, safety planning, possible admission",
    };
  } else if(severeDep||severeAnx||highFunc||mdq?.positive||chronicity&&phq9>=15){
    tier={level:4,label:"Specialist referral",color:C.peach,icon:"🏥"};
    tierDetail={
      action:"Psychiatrist referral within 1–2 weeks",
      path:"Direct psychiatric consultation recommended",
      modality:"Medication evaluation + psychotherapy; regular follow-up",
    };
  } else if(phq9>=10||gad7>=10||functionalAvg>=5){
    tier={level:3,label:"GP-led treatment",color:C.amber,icon:"🩺"};
    tierDetail={
      action:"GP or family physician consultation within 2 weeks",
      path:"Primary care with option to refer if no improvement in 6–8 weeks",
      modality:"SSRI first-line + brief psychological intervention or CBT",
    };
  } else if(phq9>=5||gad7>=5){
    tier={level:2,label:"Counselling / guided self-help",color:C.sky,icon:"🤝"};
    tierDetail={
      action:"Counsellor or psychologist within 2–4 weeks",
      path:"Psychological intervention without medication, structured self-help",
      modality:"CBT-based counselling, digital CBT, regular self-monitoring",
    };
  } else {
    tier={level:1,label:"Watchful waiting",color:C.sage,icon:"🌱"};
    tierDetail={
      action:"Self-care and monitoring",
      path:"Re-screen in 2–4 weeks; seek help if symptoms worsen",
      modality:"Lifestyle, sleep hygiene, social connection, stress management",
    };
  }

  /* ── Medication flags ─────────────────────────────────────── */
  const medFlags=[];
  if(meds && Array.isArray(meds.selected)){
    meds.selected.forEach(key=>{
      const m=MOOD_AFFECTING_MEDS.find(x=>x.key===key);
      if(m) medFlags.push(m);
    });
  }

  return {primary,icd11,dsm5,diffs:diffs.slice(0,5),tier,tierDetail,medFlags,chronicity,acute};
}

/* ─── Shared UI ─────────────────────────────────────────────────── */
function Fade({children,delay=0}){
  const [v,setV]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setV(true),delay);return()=>clearTimeout(t);},[delay]);
  return <div style={{opacity:v?1:0,transform:v?"translateY(0)":"translateY(14px)",transition:"opacity 0.5s ease,transform 0.5s ease"}}>{children}</div>;
}
function Pill({children,color}){
  return <span style={{display:"inline-block",padding:"4px 14px",borderRadius:20,background:color+"22",color,fontSize:12,fontWeight:800,letterSpacing:0.8,textTransform:"uppercase"}}>{children}</span>;
}
function Card({children,style={}}){
  return <div style={{background:C.card,borderRadius:24,border:`1.5px solid ${C.border}`,padding:"24px 22px",boxShadow:"0 2px 20px rgba(180,140,120,0.07)",...style}}>{children}</div>;
}
function WarmButton({children,onClick,variant="primary",disabled=false,style={}}){
  const v={
    primary:{bg:C.peach,fg:C.white,br:C.peach},
    secondary:{bg:C.white,fg:C.text,br:C.border},
    sage:{bg:C.sage,fg:C.white,br:C.sage},
    ghost:{bg:"transparent",fg:C.peach,br:C.peach},
    teal:{bg:C.teal,fg:C.white,br:C.teal},
    rose:{bg:C.rose,fg:C.white,br:C.rose},
    indigo:{bg:C.indigo,fg:C.white,br:C.indigo},
    lavender:{bg:C.lavender,fg:C.white,br:C.lavender},
    amber:{bg:C.amber,fg:C.white,br:C.amber},
    sky:{bg:C.sky,fg:C.white,br:C.sky},
  }[variant]||{bg:C.peach,fg:C.white,br:C.peach};
  return <button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"16px 22px",borderRadius:18,border:`2px solid ${disabled?C.border:v.br}`,background:disabled?C.border:v.bg,color:disabled?C.textMuted:v.fg,fontSize:15,fontWeight:800,cursor:disabled?"not-allowed":"pointer",fontFamily:FB,transition:"all 0.2s ease",boxShadow:disabled?"none":"0 3px 14px rgba(0,0,0,0.08)",...style}}>{children}</button>;
}
function BackBar({onBack,label="Back"}){
  if(!onBack) return null;
  return(
    <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:14,fontWeight:700,padding:"4px 0 16px",fontFamily:FB}}>
      ← {label}
    </button>
  );
}
function BgDecor(){
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
    <div style={{position:"absolute",top:-120,right:-80,width:340,height:340,borderRadius:"50%",background:"radial-gradient(circle,#fdeee688 0%,transparent 70%)"}}/>
    <div style={{position:"absolute",bottom:-100,left:-60,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,#e8f4ed88 0%,transparent 70%)"}}/>
    <div style={{position:"absolute",top:"40%",left:-40,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,#e8f0fa66 0%,transparent 70%)"}}/>
  </div>;
}

/* ─── Skip confirmation ─────────────────────────────────────────── */
function SkipPrompt({onConfirm,onCancel}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(45,36,32,0.55)",zIndex:200,backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:C.white,borderRadius:22,padding:"24px",maxWidth:340,width:"100%",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}}>
        <div style={{fontSize:36,textAlign:"center",marginBottom:10}}>🌸</div>
        <h3 style={{fontFamily:FD,fontSize:19,color:C.text,textAlign:"center",marginBottom:10}}>That's okay</h3>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.7,textAlign:"center",marginBottom:20}}>You don't have to answer anything you're not ready for. We'll move on gently.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <WarmButton onClick={onConfirm}>Yes, skip this question</WarmButton>
          <WarmButton onClick={onCancel} variant="secondary">No, I'll answer</WarmButton>
        </div>
      </div>
    </div>
  );
}

/* ─── Likert with back + skip ───────────────────────────────────── */
function LikertScreen({questions,code,color,bgColor,sectionTitle,options,onComplete,onBack,allowSkip=true,answeredSoFar=[]}){
  const [current,setCurrent]=useState(answeredSoFar.length);
  const [answers,setAnswers]=useState(answeredSoFar);
  const [selected,setSelected]=useState(null);
  const [encourageMsg,setEncourageMsg]=useState("");
  const [showEncourage,setShowEncourage]=useState(false);
  const [visible,setVisible]=useState(true);
  const [showSkip,setShowSkip]=useState(false);
  const q=questions[current];
  const isCritical=code==="PHQ-9"&&current===8;
  const progress=(current/questions.length)*100;

  const handleChoice=(val)=>{
    if(selected!==null) return;
    tapHaptic("light");
    setSelected(val);
    setEncourageMsg(ENCOURAGEMENTS[Math.floor(Math.random()*ENCOURAGEMENTS.length)]);
    setShowEncourage(true);
    setTimeout(()=>{
      setShowEncourage(false);setVisible(false);
      setTimeout(()=>{
        const na=[...answers,val];
        if(current+1<questions.length){
          setAnswers(na);setCurrent(c=>c+1);setSelected(null);setVisible(true);
        } else {
          // Reset state so component is clean if re-used
          playChime("soft");
          tapHaptic("medium");
          setAnswers(na);setSelected(null);setVisible(true);
          onComplete(na.reduce((a,b)=>a+(b==="skip"?0:b),0),na);
        }
      },180);
    },420);
  };
  const handleSkip=()=>{
    setShowSkip(false);
    const na=[...answers,"skip"];
    setVisible(false);
    setTimeout(()=>{
      if(current+1<questions.length){
        setAnswers(na);setCurrent(c=>c+1);setSelected(null);setVisible(true);
      } else {
        setAnswers(na);setSelected(null);setVisible(true);
        onComplete(na.reduce((a,b)=>a+(b==="skip"?0:b),0),na);
      }
    },180);
  };
  const handleBackInside=()=>{
    if(current>0){
      setAnswers(answers.slice(0,-1));
      setCurrent(c=>c-1);
      setSelected(null);
      setVisible(true);
    } else if(onBack) onBack();
  };

  return(
    <div>
      {showSkip && <SkipPrompt onConfirm={handleSkip} onCancel={()=>setShowSkip(false)}/>}
      <BackBar onBack={handleBackInside} label={current>0?"Previous question":"Back"}/>
      <div style={{marginBottom:22}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <Pill color={color}>{code} · {sectionTitle}</Pill>
          <span style={{color:C.textMuted,fontSize:13,fontWeight:600}}>{current+1} / {questions.length}</span>
        </div>
        <div style={{height:7,background:C.border,borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:color,borderRadius:4,transition:"width 0.5s ease"}}/>
        </div>
      </div>
      {isCritical&&(
        <Fade>
          <div style={{background:C.amberLight,border:`1.5px solid ${C.amber}55`,borderRadius:16,padding:"14px 18px",marginBottom:18}}>
            <p style={{color:C.amber,fontWeight:800,fontSize:14,marginBottom:4}}>💛 A sensitive question</p>
            <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}>Please answer honestly if you can, or skip if you're not ready. If you're struggling, iCall is one call away: <strong>9152987821</strong></p>
          </div>
        </Fade>
      )}
      <div style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(10px)",transition:"opacity 0.35s ease,transform 0.35s ease"}}>
        <Card style={{marginBottom:18,background:bgColor,border:`1.5px solid ${color}33`,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:8}}>{q.emoji}</div>
          <p style={{color:C.textSoft,fontSize:13,marginBottom:10}}>Over the <strong>last 2 weeks</strong>, how often have you been experiencing…</p>
          <p style={{fontFamily:FD,color:C.text,fontSize:17,lineHeight:1.65,fontWeight:600}}>{q.q}</p>
        </Card>
      </div>
      <div style={{textAlign:"center",height:28,marginBottom:12,opacity:showEncourage?1:0,transition:"all 0.35s ease"}}>
        <span style={{color:C.sage,fontWeight:800,fontSize:14}}>{encourageMsg}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {options.map(ch=>(
          <button key={ch.value} onClick={()=>handleChoice(ch.value)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:16,border:`2px solid ${selected===ch.value?ch.color||color:C.border}`,background:selected===ch.value?(ch.color||color)+"1a":C.card,cursor:selected!==null?"default":"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.18s ease",opacity:selected!==null&&selected!==ch.value?0.4:1}}>
            <div style={{width:34,height:34,borderRadius:10,background:(ch.color||color)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:ch.color||color,fontWeight:800,fontSize:14}}>{ch.value}</span></div>
            <div><div style={{color:C.text,fontWeight:700,fontSize:14}}>{ch.label}</div>{ch.sub&&<div style={{color:C.textSoft,fontSize:12}}>{ch.sub}</div>}</div>
            {selected===ch.value&&<span style={{marginLeft:"auto",color:ch.color||color,fontSize:18}}>✓</span>}
          </button>
        ))}
      </div>
      {allowSkip&&(
        <button onClick={()=>setShowSkip(true)} style={{display:"block",margin:"18px auto 0",background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:13,fontFamily:FB,fontStyle:"italic",padding:"8px 14px"}}>
          I'd rather not answer this →
        </button>
      )}
    </div>
  );
}

/* ─── Trigger warning screen ─────────────────────────────────────── */
function TriggerWarning({title,message,color,emoji,onContinue,onSkipSection}){
  return(
    <div style={{textAlign:"center",paddingTop:32}}>
      <Fade>
        <div style={{fontSize:56,marginBottom:12}}>{emoji}</div>
        <Pill color={color}>Gentle heads-up</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"14px 0 12px"}}>{title}</h2>
        <p style={{color:C.textMid,fontSize:15,lineHeight:1.85,marginBottom:24}}>{message}</p>
        <div style={{background:color+"13",border:`1.5px solid ${color}44`,borderRadius:16,padding:"16px 18px",marginBottom:24,textAlign:"left"}}>
          <p style={{color:color,fontWeight:800,fontSize:13,marginBottom:6}}>🌱 You're in control</p>
          <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}>You can skip any question, take a break, or stop completely. Your comfort matters more than completing the assessment.</p>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <WarmButton onClick={onContinue} style={{background:color,borderColor:color}}>I'm ready to continue →</WarmButton>
          <WarmButton onClick={onSkipSection} variant="secondary">Skip this section</WarmButton>
        </div>
      </Fade>
    </div>
  );
}

/* ─── Wind-down breathing ────────────────────────────────────────── */
const WINDDOWN_STEPS=[
  {phase:"in",  label:"Breathe In",  duration:4, scale:1.4},
  {phase:"hold",label:"Hold",        duration:4, scale:0.95},
  {phase:"out", label:"Breathe Out", duration:6, scale:0.85},
];
function WindDown({onContinue}){
  const [stepIdx,setStepIdx]=useState(0);
  const [count,setCount]=useState(WINDDOWN_STEPS[0].duration);
  const [round,setRound]=useState(1);
  const [done,setDone]=useState(false);
  const totalRounds=3;

  useEffect(()=>{
    if(done) return;
    const timer=setInterval(()=>{
      setCount(c=>{
        if(c>1) return c-1;
        // phase complete — advance
        setStepIdx(s=>{
          const next=(s+1)%WINDDOWN_STEPS.length;
          if(next===0){
            // completed a full round
            setRound(r=>{
              if(r>=totalRounds){
                setDone(true);
                return r;
              }
              return r+1;
            });
          }
          return next;
        });
        return null; // will be reset in the next effect below
      });
    },1000);
    return()=>clearInterval(timer);
  },[done]);

  // Reset count when step changes
  useEffect(()=>{
    if(!done) setCount(WINDDOWN_STEPS[stepIdx].duration);
  },[stepIdx,done]);

  const cur=WINDDOWN_STEPS[stepIdx];
  const displayCount=count==null?cur.duration:count;

  return(
    <div style={{textAlign:"center",paddingTop:30}}>
      <Fade>
        <Pill color={C.sage}>A moment for you</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"14px 0 8px"}}>You've just answered some hard questions</h2>
        <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28}}>Before we look at your results, take a breath with us. You've done something brave today.</p>
        <div style={{position:"relative",width:180,height:180,margin:"0 auto 24px",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",background:C.sage+"18",transform:`scale(${cur.scale})`,transition:`transform ${cur.duration*0.9}s ease`}}/>
          <div style={{position:"absolute",inset:14,borderRadius:"50%",background:C.sage+"28",transform:`scale(${cur.scale*0.9})`,transition:`transform ${cur.duration*0.9}s ease`}}/>
          <div style={{position:"relative",zIndex:1}}>
            <div style={{color:C.sage,fontWeight:800,fontSize:32}}>{done?"✓":displayCount}</div>
            <div style={{color:C.sage,fontWeight:700,fontSize:13,marginTop:2}}>{done?"Complete":cur.label}</div>
          </div>
        </div>
        <p style={{fontFamily:FD,color:C.textSoft,fontSize:14,fontStyle:"italic",marginBottom:24}}>
          {done?"You did it. Take one more moment here if you'd like.":`Round ${Math.min(round,totalRounds)} of ${totalRounds}`}
        </p>
        <WarmButton onClick={onContinue} variant="sage">
          {done?"See my results →":"Skip breathing and see results →"}
        </WarmButton>
      </Fade>
    </div>
  );
}

/* ─── Profile screen (age+gender) ────────────────────────────────── */
function ProfileScreen({onComplete,onBack,initial}){
  const [gender,setGender]=useState(initial?.gender||"");
  const [ageGroup,setAgeGroup]=useState(initial?.ageGroup||"");
  const valid=ageGroup&&gender;
  const ageGroups=[
    {label:"Under 18",val:"under18",icon:"🌱"},
    {label:"18–25",val:"18-25",icon:"🌿"},
    {label:"26–40",val:"26-40",icon:"🌳"},
    {label:"41–60",val:"41-60",icon:"🍂"},
    {label:"Over 60",val:"60+",icon:"🌾"},
  ];
  const genders=[
    {label:"Male",val:"male",icon:"👨"},
    {label:"Female",val:"female",icon:"👩"},
    {label:"Other / Prefer not to say",val:"other",icon:"🧑"},
  ];
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.sky}>About You</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>A few quick details</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:24}}>This helps us tailor the assessment. Nothing is stored or shared — it stays on your device only.</p>
      </Fade>
      <Fade delay={150}>
        <div style={{marginBottom:22}}>
          <div style={{color:C.textSoft,fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Age group</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ageGroups.map(a=>(
              <button key={a.val} onClick={()=>setAgeGroup(a.val)} style={{padding:"10px 16px",borderRadius:14,border:`2px solid ${ageGroup===a.val?C.sky:C.border}`,background:ageGroup===a.val?C.skyLight:C.card,color:C.text,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",gap:6}}>
                <span>{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>
      </Fade>
      <Fade delay={250}>
        <div style={{marginBottom:28}}>
          <div style={{color:C.textSoft,fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Gender</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {genders.map(g=>(
              <button key={g.val} onClick={()=>setGender(g.val)} style={{padding:"14px 18px",borderRadius:14,border:`2px solid ${gender===g.val?C.peach:C.border}`,background:gender===g.val?C.peachLight:C.card,color:C.text,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
                <span style={{fontSize:22}}>{g.icon}</span>{g.label}
                {gender===g.val&&<span style={{marginLeft:"auto",color:C.peach}}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </Fade>
      <Fade delay={350}>
        <WarmButton onClick={()=>onComplete({ageGroup,gender})} disabled={!valid}>Continue →</WarmButton>
      </Fade>
    </div>
  );
}

/* ─── Medical history ────────────────────────────────────────────── */
function MedicalHistoryScreen({onComplete,onBack,initial}){
  const [answers,setAnswers]=useState(initial||{});
  const questions=[
    {id:"thyroid",q:"Do you have a known thyroid condition?",icon:"🦋",note:"Thyroid disorders can cause mood symptoms"},
    {id:"meds",q:"Are you currently taking any regular medications?",icon:"💊",note:"Some medications affect mood"},
    {id:"substances",q:"Do you use alcohol, tobacco, or other substances regularly?",icon:"🍷",note:"Can affect mental health"},
    {id:"chronic",q:"Do you have any chronic physical health condition (diabetes, heart disease, chronic pain, etc.)?",icon:"🏥",note:"Chronic illness is a risk factor"},
    {id:"head",q:"Have you ever had a significant head injury, seizures, or neurological condition?",icon:"🧠",note:"Can affect mood and behaviour"},
    {id:"family",q:"Does any immediate family member have depression, anxiety, or bipolar disorder?",icon:"👨‍👩‍👧",note:"Family history affects risk"},
  ];
  const toggle=(id,val)=>setAnswers(a=>({...a,[id]:val}));
  const allAnswered=questions.every(q=>answers[q.id]!==undefined);
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.teal}>Medical Background</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>A few medical questions</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:22}}>Medical factors significantly affect mental health. These help us give better guidance.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
        {questions.map((q,i)=>(
          <Fade key={q.id} delay={i*60}>
            <Card style={{padding:"16px 18px"}}>
              <div style={{display:"flex",gap:12,marginBottom:10}}>
                <span style={{fontSize:22,flexShrink:0}}>{q.icon}</span>
                <div>
                  <p style={{color:C.text,fontWeight:700,fontSize:14,lineHeight:1.6,marginBottom:3}}>{q.q}</p>
                  <p style={{color:C.textMuted,fontSize:12,fontStyle:"italic"}}>{q.note}</p>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {["Yes","No","Not sure"].map(opt=>(
                  <button key={opt} onClick={()=>toggle(q.id,opt)} style={{flex:1,padding:"9px",borderRadius:11,border:`2px solid ${answers[q.id]===opt?C.teal:C.border}`,background:answers[q.id]===opt?C.tealLight:C.card,color:answers[q.id]===opt?C.teal:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:FB}}>
                    {opt}
                  </button>
                ))}
              </div>
            </Card>
          </Fade>
        ))}
      </div>
      <WarmButton onClick={()=>onComplete(answers)} disabled={!allAnswered} variant="teal">Continue →</WarmButton>
    </div>
  );
}

/* ─── Duration screen ────────────────────────────────────────────── */
function DurationScreen({onComplete,onBack,initial}){
  const [duration,setDuration]=useState(initial?.duration||"");
  const [onset,setOnset]=useState(initial?.onset||"");
  const durations=[
    {label:"Less than 2 weeks",val:"acute",icon:"🌱",note:"Acute — may be situational"},
    {label:"2–4 weeks",val:"subacute",icon:"🌿",note:"Recent"},
    {label:"1–3 months",val:"moderate",icon:"🌳",note:"Moderate duration"},
    {label:"3–12 months",val:"chronic",icon:"🍂",note:"Chronic"},
    {label:"Over a year",val:"longterm",icon:"🌾",note:"Long-term"},
  ];
  const onsets=[
    {label:"Gradually",val:"gradual",icon:"🌊"},
    {label:"After an event",val:"event",icon:"⚡"},
    {label:"No clear reason",val:"unclear",icon:"❓"},
    {label:"I'm not sure",val:"unsure",icon:"🤷"},
  ];
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.amber}>Duration & Onset</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>How long have you been feeling this way?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:22}}>This helps distinguish acute reactions from chronic conditions.</p>
      </Fade>
      <Fade delay={100}>
        <div style={{marginBottom:22}}>
          <div style={{color:C.textSoft,fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>How long?</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {durations.map(d=>(
              <button key={d.val} onClick={()=>setDuration(d.val)} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",borderRadius:14,border:`2px solid ${duration===d.val?C.amber:C.border}`,background:duration===d.val?C.amberLight:C.card,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB}}>
                <span style={{fontSize:22}}>{d.icon}</span>
                <div style={{flex:1}}>
                  <div style={{color:C.text,fontWeight:700,fontSize:14}}>{d.label}</div>
                  <div style={{color:C.textSoft,fontSize:12}}>{d.note}</div>
                </div>
                {duration===d.val&&<span style={{color:C.amber,fontSize:16}}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </Fade>
      <Fade delay={200}>
        <div style={{marginBottom:28}}>
          <div style={{color:C.textSoft,fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>How did it start?</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {onsets.map(o=>(
              <button key={o.val} onClick={()=>setOnset(o.val)} style={{padding:"12px 10px",borderRadius:12,border:`2px solid ${onset===o.val?C.amber:C.border}`,background:onset===o.val?C.amberLight:C.card,cursor:"pointer",fontFamily:FB,textAlign:"center"}}>
                <div style={{fontSize:22,marginBottom:4}}>{o.icon}</div>
                <div style={{color:C.text,fontWeight:700,fontSize:13}}>{o.label}</div>
              </button>
            ))}
          </div>
        </div>
      </Fade>
      <WarmButton onClick={()=>onComplete({duration,onset})} disabled={!duration||!onset} variant="sage">Continue →</WarmButton>
    </div>
  );
}

/* ─── Functional impairment ──────────────────────────────────────── */
function FunctionalScreen({onComplete,onBack,initial}){
  const [scores,setScores]=useState(initial||{work:null,relationships:null,selfcare:null});
  const domains=[
    {id:"work",label:"Work / Studies / Daily tasks",icon:"💼"},
    {id:"relationships",label:"Relationships & social life",icon:"🤝"},
    {id:"selfcare",label:"Looking after yourself",icon:"🌿"},
  ];
  const allDone=Object.values(scores).every(v=>v!==null);
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.indigo}>Functional Impact</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 6px"}}>How are these feelings affecting your life?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:20}}>Rate 0 (no impact) to 10 (can't function). A core part of any mental health assessment.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:16,marginBottom:24}}>
        {domains.map((d,i)=>(
          <Fade key={d.id} delay={i*100}>
            <Card>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <span style={{fontSize:22}}>{d.icon}</span>
                <span style={{color:C.text,fontWeight:700,fontSize:14}}>{d.label}</span>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {[0,1,2,3,4,5,6,7,8,9,10].map(n=>{
                  const intensity=n<=3?C.sage:n<=6?C.amber:C.rose;
                  return(
                    <button key={n} onClick={()=>setScores(s=>({...s,[d.id]:n}))} style={{width:32,height:32,borderRadius:9,border:`2px solid ${scores[d.id]===n?intensity:C.border}`,background:scores[d.id]===n?intensity:C.card,color:scores[d.id]===n?C.white:C.textMid,fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:FB}}>
                      {n}
                    </button>
                  );
                })}
              </div>
              {scores[d.id]!==null&&(
                <div style={{marginTop:8,fontSize:12,color:C.textSoft}}>
                  {scores[d.id]<=3?"Mild — manageable":scores[d.id]<=6?"Moderate — affecting life":"Significant — needs attention"}
                </div>
              )}
            </Card>
          </Fade>
        ))}
      </div>
      <WarmButton onClick={()=>onComplete(scores)} disabled={!allDone} variant="indigo">Continue →</WarmButton>
    </div>
  );
}

/* ─── MDQ bipolar screen ─────────────────────────────────────────── */
function MDQScreen({onComplete,onBack}){
  const [answers,setAnswers]=useState({});
  const [phase,setPhase]=useState("items");
  const [cluster,setCluster]=useState(null);
  const [impact,setImpact]=useState(null);
  const yesCount=Object.values(answers).filter(v=>v==="yes").length;

  if(phase==="items")return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.lavender}>Mood Episode Screen</Pill>
        <h2 style={{fontFamily:FD,fontSize:20,color:C.text,margin:"12px 0 8px"}}>Have you ever had a period of unusually high or irritable mood?</h2>
        <p style={{color:C.textMid,fontSize:13,lineHeight:1.75,marginBottom:16}}>Think of a time — even years ago — when you felt very different from usual.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:22}}>
        {MDQ_ITEMS.map((item,i)=>(
          <Fade key={i} delay={i*30}>
            <Card style={{padding:"14px 16px"}}>
              <p style={{color:C.text,fontSize:13,lineHeight:1.6,marginBottom:10}}>{i+1}. {item}</p>
              <div style={{display:"flex",gap:8}}>
                {["Yes","No"].map(opt=>(
                  <button key={opt} onClick={()=>setAnswers(a=>({...a,[i]:opt.toLowerCase()}))} style={{flex:1,padding:"9px",borderRadius:10,border:`2px solid ${answers[i]===opt.toLowerCase()?C.lavender:C.border}`,background:answers[i]===opt.toLowerCase()?C.lavenderLight:C.card,color:answers[i]===opt.toLowerCase()?C.lavender:C.textMid,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:FB}}>
                    {opt}
                  </button>
                ))}
              </div>
            </Card>
          </Fade>
        ))}
      </div>
      <WarmButton onClick={()=>setPhase("cluster")} disabled={Object.keys(answers).length<MDQ_ITEMS.length} variant="lavender">Next →</WarmButton>
    </div>
  );

  if(phase==="cluster")return(
    <div>
      <BackBar onBack={()=>setPhase("items")}/>
      <Fade>
        <Pill color={C.lavender}>Mood Episode Screen</Pill>
        <h2 style={{fontFamily:FD,fontSize:20,color:C.text,margin:"12px 0 12px"}}>Did several of these happen during the same time period?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:22}}>Not at separate times — together, in the same episode.</p>
        <div style={{display:"flex",gap:12,marginBottom:22}}>
          {["Yes","No"].map(opt=>(
            <button key={opt} onClick={()=>setCluster(opt.toLowerCase())} style={{flex:1,padding:"18px",borderRadius:16,border:`2px solid ${cluster===opt.toLowerCase()?C.lavender:C.border}`,background:cluster===opt.toLowerCase()?C.lavenderLight:C.card,color:cluster===opt.toLowerCase()?C.lavender:C.textMid,fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:FB}}>{opt}</button>
          ))}
        </div>
        <WarmButton onClick={()=>setPhase("impact")} disabled={!cluster} variant="lavender">Next →</WarmButton>
      </Fade>
    </div>
  );

  return(
    <div>
      <BackBar onBack={()=>setPhase("cluster")}/>
      <Fade>
        <Pill color={C.lavender}>Mood Episode Screen</Pill>
        <h2 style={{fontFamily:FD,fontSize:20,color:C.text,margin:"12px 0 12px"}}>How much of a problem did these cause?</h2>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:22}}>
          {["No problem","Minor problem","Moderate problem","Serious problem"].map((opt,i)=>(
            <button key={opt} onClick={()=>setImpact(i)} style={{padding:"14px 18px",borderRadius:14,border:`2px solid ${impact===i?C.lavender:C.border}`,background:impact===i?C.lavenderLight:C.card,color:C.text,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FB,textAlign:"left"}}>{opt}</button>
          ))}
        </div>
        <WarmButton onClick={()=>onComplete({yesCount,cluster,impact,positive:yesCount>=7&&cluster==="yes"&&impact>=2})} disabled={impact===null} variant="lavender">Continue →</WarmButton>
      </Fade>
    </div>
  );
}

/* ─── Trauma screen ──────────────────────────────────────────────── */
function TraumaScreen({onComplete,onBack}){
  const [hasTrauma,setHasTrauma]=useState(null);
  const [answers,setAnswers]=useState({});
  const [phase,setPhase]=useState("gate");
  if(phase==="gate")return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.rose}>Trauma Screen</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 8px"}}>Have you ever experienced something very stressful or traumatic?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:14}}>This could include an accident, assault, loss, serious illness, or any overwhelming experience.</p>
        <div style={{background:C.roseLight,border:`1.5px solid ${C.rose}33`,borderRadius:14,padding:"12px 16px",marginBottom:20}}>
          <p style={{color:C.rose,fontSize:13,fontWeight:700}}>🌸 You don't need to share details. Only Yes or No.</p>
        </div>
        <div style={{display:"flex",gap:12,marginBottom:22}}>
          {["Yes","No"].map(opt=>(
            <button key={opt} onClick={()=>setHasTrauma(opt.toLowerCase())} style={{flex:1,padding:"18px",borderRadius:16,border:`2px solid ${hasTrauma===opt.toLowerCase()?C.rose:C.border}`,background:hasTrauma===opt.toLowerCase()?C.roseLight:C.card,color:hasTrauma===opt.toLowerCase()?C.rose:C.textMid,fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:FB}}>{opt}</button>
          ))}
        </div>
        <WarmButton onClick={()=>{if(hasTrauma==="no")onComplete({score:0,positive:false,skipped:true});else setPhase("questions");}} disabled={!hasTrauma} variant="secondary">
          {hasTrauma==="no"?"Skip this section →":"Continue →"}
        </WarmButton>
      </Fade>
    </div>
  );
  const answered=Object.keys(answers).length;
  return(
    <div>
      <BackBar onBack={()=>setPhase("gate")}/>
      <Fade>
        <Pill color={C.rose}>Trauma Screen (PC-PTSD-5)</Pill>
        <h2 style={{fontFamily:FD,fontSize:21,color:C.text,margin:"12px 0 8px"}}>In the past month, have you…</h2>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden",marginBottom:18}}>
          <div style={{height:"100%",width:`${(answered/PCPTSD5.length)*100}%`,background:C.rose,borderRadius:3,transition:"width 0.4s"}}/>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:22}}>
        {PCPTSD5.map((item,i)=>(
          <Fade key={i} delay={i*50}>
            <Card style={{padding:"14px 16px"}}>
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                <span style={{fontSize:20,flexShrink:0}}>{item.emoji}</span>
                <p style={{color:C.text,fontSize:13,lineHeight:1.6}}>{item.q}</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                {["Yes","No"].map(opt=>(
                  <button key={opt} onClick={()=>setAnswers(a=>({...a,[i]:opt==="Yes"}))} style={{flex:1,padding:"9px",borderRadius:10,border:`2px solid ${answers[i]===(opt==="Yes")?(opt==="Yes"?C.rose:C.sage):C.border}`,background:answers[i]===(opt==="Yes")?(opt==="Yes"?C.roseLight:C.sageLight):C.card,color:C.textMid,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:FB}}>{opt}</button>
                ))}
              </div>
            </Card>
          </Fade>
        ))}
      </div>
      <WarmButton onClick={()=>{const score=Object.values(answers).filter(Boolean).length;onComplete({score,positive:score>=3,skipped:false});}} disabled={answered<PCPTSD5.length} variant="rose">Continue →</WarmButton>
    </div>
  );
}

/* ─── Sleep screen ───────────────────────────────────────────────── */
function SleepScreen({onComplete,onBack}){
  const [answers,setAnswers]=useState({});
  const allDone=Object.keys(answers).length===SLEEP_Qs.length;
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.indigo}>Sleep Quality</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 8px"}}>How has your sleep been?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:20}}>Over the last month — sleep and mental health are deeply connected.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:22}}>
        {SLEEP_Qs.map((q,i)=>(
          <Fade key={i} delay={i*60}>
            <Card>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}>
                <span style={{fontSize:24}}>{q.emoji}</span>
                <p style={{color:C.text,fontWeight:700,fontSize:14,lineHeight:1.55}}>{q.q}</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {q.options.map(opt=>(
                  <button key={opt.value} onClick={()=>setAnswers(a=>({...a,[i]:opt.value}))} style={{padding:"10px 14px",borderRadius:10,border:`2px solid ${answers[i]===opt.value?C.indigo:C.border}`,background:answers[i]===opt.value?C.indigoLight:C.card,color:C.text,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:FB,textAlign:"left",display:"flex",justifyContent:"space-between"}}>
                    {opt.label}
                    {answers[i]===opt.value&&<span style={{color:C.indigo}}>✓</span>}
                  </button>
                ))}
              </div>
            </Card>
          </Fade>
        ))}
      </div>
      <WarmButton onClick={()=>{const score=Object.values(answers).reduce((a,b)=>a+b,0);onComplete({score,poor:score>=5});}} disabled={!allDone} variant="indigo">Continue →</WarmButton>
    </div>
  );
}

/* ─── Psychosis screen ───────────────────────────────────────────── */
function PsychosisScreen({onComplete,onBack}){
  const [answers,setAnswers]=useState({});
  const allDone=Object.keys(answers).length===PSYCHOSIS_Qs.length;
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.teal}>Perceptual Experiences</Pill>
        <h2 style={{fontFamily:FD,fontSize:20,color:C.text,margin:"12px 0 8px"}}>A couple of gentle questions</h2>
        <div style={{background:C.tealLight,border:`1.5px solid ${C.teal}44`,borderRadius:14,padding:"12px 16px",marginBottom:20}}>
          <p style={{color:C.teal,fontSize:13,fontWeight:700}}>🌿 These experiences are more common than people think and are often treatable.</p>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:22}}>
        {PSYCHOSIS_Qs.map((q,i)=>(
          <Fade key={i} delay={i*100}>
            <Card style={{padding:"16px 18px"}}>
              <div style={{display:"flex",gap:10,marginBottom:12}}>
                <span style={{fontSize:22,flexShrink:0}}>{q.emoji}</span>
                <p style={{color:C.text,fontWeight:700,fontSize:14,lineHeight:1.6}}>{q.q}</p>
              </div>
              <div style={{display:"flex",gap:8}}>
                {["Yes","No","Sometimes"].map(opt=>(
                  <button key={opt} onClick={()=>setAnswers(a=>({...a,[i]:opt}))} style={{flex:1,padding:"9px",borderRadius:10,border:`2px solid ${answers[i]===opt?C.teal:C.border}`,background:answers[i]===opt?C.tealLight:C.card,color:answers[i]===opt?C.teal:C.textMid,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:FB}}>{opt}</button>
                ))}
              </div>
            </Card>
          </Fade>
        ))}
      </div>
      <WarmButton onClick={()=>{const flag=Object.values(answers).some(v=>v==="Yes"||v==="Sometimes");onComplete({answers,flag});}} disabled={!allDone} variant="teal">Continue →</WarmButton>
    </div>
  );
}

/* ─── C-SSRS Safety ──────────────────────────────────────────────── */
function SafetyScreen({onComplete,onBack}){
  const [level,setLevel]=useState(0);
  const [notifyName,setNotifyName]=useState("");
  const [notifyPhone,setNotifyPhone]=useState("");
  const [phase,setPhase]=useState("screen");

  const handleAnswer=(q,yes)=>{
    if(!yes){
      if(q.level===1) onComplete({level:0,safe:true});
      else onComplete({level:q.level-1,safe:q.level<=2});
      return;
    }
    if(q.level>=3){setLevel(q.level);setPhase("crisis");}
    else setLevel(q.level);
  };

  if(phase==="crisis")return(
    <div>
      <Fade>
        <div style={{background:C.roseLight,border:`2px solid ${C.rose}`,borderRadius:22,padding:"22px",marginBottom:18,textAlign:"center"}}>
          <div style={{fontSize:44,marginBottom:10}}>💙</div>
          <h2 style={{fontFamily:FD,fontSize:22,color:C.rose,marginBottom:10}}>We're so glad you're still here</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.85,marginBottom:16}}>What you're going through sounds incredibly hard. You matter, and help is right here — please reach out to someone today. You don't have to carry this alone.</p>
          <div style={{textAlign:"left",background:C.white,borderRadius:16,padding:"14px 16px",marginBottom:14}}>
            <div style={{color:C.text,fontSize:14,fontWeight:700,lineHeight:2.4}}>
              📞 <a href="tel:9152987821" style={{color:C.rose,fontWeight:800}}>iCall: 9152987821</a><br/>
              📞 <a href="tel:18602662345" style={{color:C.rose,fontWeight:800}}>Vandrevala (24/7): 1860-2662-345</a><br/>
              📞 <a href="tel:08046110007" style={{color:C.rose,fontWeight:800}}>NIMHANS: 080-46110007</a><br/>
              🏥 <span style={{color:C.textMid}}>Or go to your nearest hospital</span>
            </div>
          </div>
        </div>
      </Fade>
      <Fade delay={200}>
        <Card style={{marginBottom:14}}>
          <h3 style={{color:C.text,fontWeight:800,fontSize:15,marginBottom:10}}>🌸 A small plan to keep you safe right now</h3>
          {["Call one of the helplines above","Tell someone you trust how you're feeling","Put anything you could use to hurt yourself out of easy reach","Stay near someone, or go somewhere public"].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:7}}>
              <span style={{color:C.sage,fontWeight:800,fontSize:15}}>✓</span>
              <span style={{color:C.textMid,fontSize:13,lineHeight:1.55}}>{s}</span>
            </div>
          ))}
        </Card>
      </Fade>
      <Fade delay={300}>
        <Card style={{marginBottom:18}}>
          <h3 style={{color:C.text,fontWeight:800,fontSize:14,marginBottom:10}}>👤 Someone you trust (optional)</h3>
          <p style={{color:C.textMid,fontSize:12,marginBottom:12}}>Note down someone who should know you need support.</p>
          <input value={notifyName} onChange={e=>setNotifyName(e.target.value)} placeholder="Their name" style={{width:"100%",padding:"10px 12px",borderRadius:11,border:`1.5px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,fontFamily:FB,outline:"none",marginBottom:8}}/>
          <input value={notifyPhone} onChange={e=>setNotifyPhone(e.target.value)} placeholder="Phone number (optional)" style={{width:"100%",padding:"10px 12px",borderRadius:11,border:`1.5px solid ${C.border}`,background:C.bg,color:C.text,fontSize:13,fontFamily:FB,outline:"none"}}/>
          {notifyPhone&&<a href={`tel:${notifyPhone}`} style={{display:"block",marginTop:10,padding:"11px",borderRadius:11,background:C.sage,color:C.white,fontWeight:800,fontSize:13,textAlign:"center",textDecoration:"none"}}>📞 Call {notifyName||"them"} now</a>}
        </Card>
      </Fade>
      <WarmButton onClick={()=>onComplete({level,safe:false,notifyName,notifyPhone})} variant="rose">I've read the safety information →</WarmButton>
    </div>
  );

  const currentQ=CSSRS[level];
  if(!currentQ){onComplete({level,safe:level<=2});return null;}
  return(
    <div>
      <Fade>
        <div style={{background:C.amberLight,border:`1.5px solid ${C.amber}`,borderRadius:16,padding:"14px 18px",marginBottom:18}}>
          <p style={{color:C.amber,fontWeight:800,fontSize:13,marginBottom:4}}>💛 A few gentle questions about safety</p>
          <p style={{color:C.textMid,fontSize:12,lineHeight:1.6}}>You mentioned some difficult thoughts. Please answer honestly — your safety matters most to us.</p>
        </div>
        <Pill color={C.rose}>Safety Check</Pill>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden",margin:"12px 0 18px"}}>
          <div style={{height:"100%",width:`${(level/5)*100}%`,background:C.rose,borderRadius:3,transition:"width 0.4s"}}/>
        </div>
        <Card style={{background:C.roseLight,border:`1.5px solid ${C.rose}44`,textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:40,marginBottom:10}}>{currentQ.emoji}</div>
          <p style={{fontFamily:FD,color:C.text,fontSize:16,lineHeight:1.7,fontWeight:600}}>{currentQ.q}</p>
        </Card>
        <div style={{display:"flex",gap:12}}>
          <button onClick={()=>handleAnswer(currentQ,false)} style={{flex:1,padding:"16px",borderRadius:14,border:`2px solid ${C.sage}`,background:C.sageLight,color:C.sage,fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:FB}}>No</button>
          <button onClick={()=>handleAnswer(currentQ,true)} style={{flex:1,padding:"16px",borderRadius:14,border:`2px solid ${C.rose}`,background:C.roseLight,color:C.rose,fontWeight:800,fontSize:15,cursor:"pointer",fontFamily:FB}}>Yes</button>
        </div>
        <p style={{color:C.textMuted,fontSize:12,textAlign:"center",marginTop:14}}>iCall: <strong>9152987821</strong> — available now if you need to talk</p>
      </Fade>
    </div>
  );
}

/* ─── Section bridge ─────────────────────────────────────────────── */
function SectionBridge({title,message,emoji,color,buttonLabel,onNext}){
  return(
    <div style={{textAlign:"center",paddingTop:28}}>
      <Fade>
        <div style={{fontSize:56,marginBottom:14}}>{emoji}</div>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,marginBottom:12}}>{title}</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.85,marginBottom:28}}>{message}</p>
        <WarmButton onClick={onNext} style={{background:color,borderColor:color}}>{buttonLabel}</WarmButton>
      </Fade>
    </div>
  );
}

/* ─── Privacy page ───────────────────────────────────────────────── */
function PrivacyScreen({onBack}){
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:10}}>🔒</div>
          <Pill color={C.sage}>Your privacy</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 6px"}}>What happens to your data</h2>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.7}}>The short answer: nothing. Here's the long answer.</p>
        </div>
      </Fade>
      <Fade delay={150}>
        <Card style={{marginBottom:14,background:C.sageLight,border:`1.5px solid ${C.sage}44`}}>
          <h3 style={{color:C.sage,fontWeight:800,fontSize:15,marginBottom:10}}>✅ What we DON'T do</h3>
          {[
            "We don't use cookies, analytics, or trackers of any kind",
            "We don't send your answers to any server",
            "We don't know who you are — no login, no account",
            "We don't sell, share, or analyse your data",
            "We don't show ads",
            "We don't know your name, IP address, or location",
          ].map((t,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:6}}>
              <span style={{color:C.sage,fontWeight:800}}>✓</span>
              <span style={{color:C.textMid,fontSize:14,lineHeight:1.6}}>{t}</span>
            </div>
          ))}
        </Card>
      </Fade>
      <Fade delay={250}>
        <Card style={{marginBottom:14}}>
          <h3 style={{color:C.text,fontWeight:800,fontSize:15,marginBottom:10}}>📱 What we DO</h3>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.7,marginBottom:10}}>Your in-progress assessment is saved <strong>only on your phone or browser</strong>, so you can resume if you close the tab. This uses a feature called <em>localStorage</em> — it never leaves your device.</p>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.7,marginBottom:10}}>Once you complete the assessment, we save your scores (not your individual answers) locally so you can see progress over time. You can delete this at any time using the "Start over" button.</p>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.7}}>In-progress saves auto-delete after 24 hours.</p>
        </Card>
      </Fade>
      <Fade delay={350}>
        <Card style={{marginBottom:14,background:C.peachLight,border:`1.5px solid ${C.peach}33`}}>
          <h3 style={{color:C.peach,fontWeight:800,fontSize:15,marginBottom:10}}>👨‍⚕️ Who built this</h3>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.7}}>ManaScreen was created by a consultant radiologist based in India, who wanted to make mental health screening more accessible. This is a personal project built with care, not a commercial product.</p>
        </Card>
      </Fade>
      <Fade delay={450}>
        <div style={{background:C.amberLight,border:`1.5px solid ${C.amber}33`,borderRadius:14,padding:"14px 16px"}}>
          <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}>⚠️ <strong>Important disclaimer:</strong> ManaScreen is a wellness screening tool, not a clinical diagnosis. It uses validated clinical scales but cannot replace a professional mental health assessment.</p>
        </div>
      </Fade>
    </div>
  );
}

/* ─── References page ───────────────────────────────────────────── */
function ReferencesScreen({onBack}){
  const refs=[
    {name:"PHQ-9",full:"Patient Health Questionnaire-9",cite:"Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606-13.",use:"Depression severity screening. Validated across cultures including India."},
    {name:"PHQ-A",full:"Patient Health Questionnaire Modified for Adolescents",cite:"Johnson JG, Harris ES, Spitzer RL, Williams JB. The Patient Health Questionnaire for Adolescents: validation of an instrument for the assessment of mental disorders among adolescent primary care patients. J Adolesc Health. 2002;30(3):196-204.",use:"Depression screening validated for ages 11-17. Same scoring as PHQ-9 with age-appropriate wording."},
    {name:"GAD-7",full:"Generalized Anxiety Disorder 7-item scale",cite:"Spitzer RL, Kroenke K, Williams JB, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092-7.",use:"Anxiety severity screening. Used worldwide in primary care."},
    {name:"EPDS",full:"Edinburgh Postnatal Depression Scale",cite:"Cox JL, Holden JM, Sagovsky R. Detection of postnatal depression: development of the 10-item Edinburgh Postnatal Depression Scale. Br J Psychiatry. 1987;150:782-6.",use:"Perinatal depression screening — validated during pregnancy and up to 12 months postpartum. Cut-off ≥13 suggests probable major depression."},
    {name:"PHQ-15",full:"Patient Health Questionnaire-15",cite:"Kroenke K, Spitzer RL, Williams JB. The PHQ-15: validity of a new measure for evaluating the severity of somatic symptoms. Psychosom Med. 2002;64(2):258-66.",use:"Somatic symptom screen — particularly relevant for Indian presentations where depression often manifests physically."},
    {name:"MDQ",full:"Mood Disorder Questionnaire",cite:"Hirschfeld RM, et al. Development and validation of a screening instrument for bipolar spectrum disorder: the Mood Disorder Questionnaire. Am J Psychiatry. 2000;157(11):1873-5.",use:"Bipolar spectrum screening. Positive if ≥7 items + clustered + ≥moderate impact."},
    {name:"PC-PTSD-5",full:"Primary Care PTSD Screen for DSM-5",cite:"Prins A, Bovin MJ, Smolenski DJ, et al. The Primary Care PTSD Screen for DSM-5 (PC-PTSD-5). J Gen Intern Med. 2016;31(10):1206-11.",use:"Trauma and PTSD screening in primary care."},
    {name:"C-SSRS",full:"Columbia Suicide Severity Rating Scale",cite:"Posner K, Brown GK, Stanley B, et al. The Columbia-Suicide Severity Rating Scale: initial validity and internal consistency findings. Am J Psychiatry. 2011;168(12):1266-77.",use:"Gold-standard suicide risk stratification. Adopted by FDA and CDC."},
    {name:"PSQI (Brief)",full:"Pittsburgh Sleep Quality Index — abbreviated",cite:"Buysse DJ, Reynolds CF, Monk TH, et al. The Pittsburgh Sleep Quality Index: a new instrument for psychiatric practice and research. Psychiatry Res. 1989;28(2):193-213.",use:"Sleep quality assessment — brief version used here."},
    {name:"WHODAS 2.0 principles",full:"WHO Disability Assessment Schedule",cite:"World Health Organization. Measuring health and disability: manual for WHO Disability Assessment Schedule 2.0. Geneva: WHO; 2010.",use:"Functional impairment framework (DSM-5 requires this dimension)."},
  ];
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:10}}>📚</div>
          <Pill color={C.sky}>Clinical Evidence</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 6px"}}>References & Sources</h2>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.7}}>Every scale used in ManaScreen is a peer-reviewed, clinically validated instrument.</p>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:20}}>
        {refs.map((r,i)=>(
          <Fade key={r.name} delay={i*50}>
            <Card style={{padding:"18px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <Pill color={C.sky}>{r.name}</Pill>
                <span style={{color:C.textSoft,fontSize:12}}>{r.full}</span>
              </div>
              <p style={{color:C.text,fontSize:13,lineHeight:1.7,fontStyle:"italic",fontFamily:FD,marginBottom:8}}>{r.cite}</p>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}><strong>Used for:</strong> {r.use}</p>
            </Card>
          </Fade>
        ))}
      </div>
      <Fade delay={500}>
        <Card style={{background:C.sageLight,border:`1.5px solid ${C.sage}44`}}>
          <h3 style={{color:C.sage,fontWeight:800,fontSize:14,marginBottom:8}}>🩺 For clinicians</h3>
          <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>All instruments are used in their original validated form. Scoring thresholds follow published guidelines. ManaScreen does not modify or reinterpret the underlying scales — it simply presents them in a more patient-friendly interface.</p>
        </Card>
      </Fade>
    </div>
  );
}

/* ─── Simple & breathing exercises ──────────────────────────────── */
function BreathingExercise({exercise,onDone}){
  const [phase,setPhase]=useState(0);
  const [count,setCount]=useState(exercise.steps[0].duration);
  const [round,setRound]=useState(1);
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);
  const steps=exercise.steps;
  const totalRounds=exercise.rounds||4;

  useEffect(()=>{
    if(!running||done) return;
    const timer=setInterval(()=>{
      setCount(c=>{
        if(c>1) return c-1;
        // phase ends — advance
        setPhase(p=>{
          const next=(p+1)%steps.length;
          if(next===0){
            setRound(r=>{
              if(r>=totalRounds){
                setRunning(false);
                setDone(true);
                return r;
              }
              return r+1;
            });
          }
          return next;
        });
        return null; // reset on next effect
      });
    },1000);
    return()=>clearInterval(timer);
  },[running,done,steps,totalRounds]);

  // Reset count when phase changes
  useEffect(()=>{
    if(!done) setCount(steps[phase].duration);
  },[phase,done,steps]);

  const cur=steps[phase];
  const scale=cur.label==="Breathe In"?1.4:cur.label==="Breathe Out"?0.85:0.95;
  const displayCount=count==null?cur.duration:count;

  if(done)return(<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:64,marginBottom:16}}>✨</div><h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:10}}>Beautifully done</h3><p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28}}>Notice how you feel right now.</p><WarmButton onClick={onDone}>← Back</WarmButton></div>);
  return(<div style={{textAlign:"center"}}><div style={{color:C.textSoft,fontSize:13,marginBottom:8}}>Round {round} of {totalRounds}</div><div style={{position:"relative",width:200,height:200,margin:"0 auto 28px",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{position:"absolute",inset:0,borderRadius:"50%",background:cur.color+"18",transform:`scale(${scale})`,transition:`transform ${cur.duration*0.9}s ease`}}/><div style={{position:"absolute",inset:16,borderRadius:"50%",background:cur.color+"28",transform:`scale(${scale*0.9})`,transition:`transform ${cur.duration*0.9}s ease`}}/><div style={{position:"relative",zIndex:1}}><div style={{color:cur.color,fontWeight:800,fontSize:36}}>{displayCount}</div><div style={{color:cur.color,fontWeight:700,fontSize:14,marginTop:4}}>{cur.label}</div></div></div><p style={{fontFamily:FD,color:C.textMid,fontSize:16,lineHeight:1.7,marginBottom:24,fontStyle:"italic"}}>"{cur.instruction}"</p>{!running?<WarmButton onClick={()=>setRunning(true)} style={{background:cur.color,borderColor:cur.color}}>Begin</WarmButton>:<button onClick={()=>setRunning(false)} style={{background:"none",border:`2px solid ${C.border}`,borderRadius:18,padding:"14px",color:C.textSoft,fontSize:15,cursor:"pointer",fontFamily:FB,fontWeight:700,width:"100%"}}>Pause</button>}</div>);
}
function SimpleExercise({exercise,onDone}){
  const [step,setStep]=useState(0);
  const [done,setDone]=useState(false);
  if(done)return(<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:64,marginBottom:16}}>✨</div><h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:10}}>Well done</h3><p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28}}>Take a moment to notice how you feel.</p><WarmButton onClick={onDone}>← Back</WarmButton></div>);
  return(<div><div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden",marginBottom:24}}><div style={{height:"100%",width:`${(step/exercise.instructions.length)*100}%`,background:exercise.color,borderRadius:3,transition:"width 0.4s"}}/></div><Card style={{background:exercise.bg,border:`1.5px solid ${exercise.color}33`,textAlign:"center",marginBottom:24,minHeight:140,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:FD,color:C.text,fontSize:18,lineHeight:1.7,fontWeight:600}}>{exercise.instructions[step]}</p></Card><p style={{color:C.textSoft,fontSize:13,textAlign:"center",marginBottom:20}}>Step {step+1} of {exercise.instructions.length} — take your time</p><WarmButton onClick={()=>{if(step+1<exercise.instructions.length)setStep(step+1);else setDone(true);}} style={{background:exercise.color,borderColor:exercise.color}}>{step+1<exercise.instructions.length?"Next step →":"Complete ✓"}</WarmButton></div>);
}
/* ─── Journal prompts (Feature 7) ────────────────────────────────── */
const JOURNAL_PROMPTS = [
  {icon:"🌿", q:"What has been the hardest part of this week?",             mood:"reflect"},
  {icon:"🌸", q:"What's one small thing that still made you smile?",         mood:"gratitude"},
  {icon:"💛", q:"What would you say to a friend feeling how you feel now?", mood:"compassion"},
  {icon:"🌱", q:"If nothing had to change today — what would still be okay?",mood:"acceptance"},
  {icon:"🪷", q:"What's weighing on your mind that you haven't said aloud?", mood:"release"},
  {icon:"✨", q:"What would a gentle next step look like?",                  mood:"forward"},
  {icon:"🫧", q:"What's one thing you want to let go of today?",             mood:"release"},
  {icon:"🌻", q:"Who or what are you grateful for, however small?",          mood:"gratitude"},
];

/* ─── Journal screen ─────────────────────────────────────────────── */
function JournalScreen({onDone,onBack,initialPrompt=null}){
  // phases: pick | write | saved | list
  const [phase,setPhase]=useState(initialPrompt?"write":"pick");
  const [prompt,setPrompt]=useState(initialPrompt||JOURNAL_PROMPTS[0]);
  const [text,setText]=useState("");
  const [entries,setEntries]=useState(()=>storage.get(JOURNAL_KEY,[]));

  const save=()=>{
    if(!text.trim()) return;
    const entry={when:Date.now(),prompt:prompt.q,text:text.trim(),icon:prompt.icon};
    const updated=[...entries,entry].slice(-10); // keep last 10
    storage.set(JOURNAL_KEY,updated);
    setEntries(updated);
    playChime("soft");
    tapHaptic("medium");
    setPhase("saved");
  };

  const deleteEntry=(idx)=>{
    const updated=entries.filter((_,i)=>i!==idx);
    storage.set(JOURNAL_KEY,updated);
    setEntries(updated);
  };

  /* ── Prompt picker ─── */
  if(phase==="pick"){
    // show three random prompts + "browse all"
    const shuffled=[...JOURNAL_PROMPTS].sort(()=>Math.random()-0.5).slice(0,3);
    return(
      <div>
        <BackBar onBack={onBack}/>
        <Fade>
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:50,marginBottom:10}}>📖</div>
            <Pill color={C.lavender}>Private journal</Pill>
            <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 8px"}}>A gentle prompt</h2>
            <p style={{color:C.textMid,fontSize:14,lineHeight:1.7,maxWidth:320,margin:"0 auto"}}>Pick one that speaks to you — or browse all. Everything stays private on your device.</p>
          </div>
        </Fade>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          {shuffled.map((p,i)=>(
            <Fade key={i} delay={i*80}>
              <button onClick={()=>{tapHaptic("light");setPrompt(p);setPhase("write");}} style={{
                display:"flex",alignItems:"center",gap:14,padding:"18px 18px",
                background:`linear-gradient(135deg,${C.lavenderLight} 0%,#ffffff 100%)`,
                border:`1.5px solid ${C.lavender}33`,borderRadius:18,
                cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s",
              }}>
                <div style={{fontSize:28,flexShrink:0}}>{p.icon}</div>
                <div style={{flex:1,color:C.text,fontSize:14,fontWeight:600,lineHeight:1.5,fontFamily:FD}}>{p.q}</div>
                <span style={{color:C.lavender,fontSize:20}}>›</span>
              </button>
            </Fade>
          ))}
        </div>
        <Fade delay={260}>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>{
              const shuffledAgain=[...JOURNAL_PROMPTS].sort(()=>Math.random()-0.5).slice(0,3);
              tapHaptic("light");
              // Force re-render by updating a dummy state via prompt swap
              setPrompt(shuffledAgain[0]);setPhase("pick");
            }} style={{
              padding:"10px",background:"none",border:"none",
              color:C.lavender,fontSize:13,fontWeight:700,fontFamily:FB,cursor:"pointer",
            }}>🎲 Show different prompts</button>
            {entries.length>0 && (
              <button onClick={()=>setPhase("list")} style={{
                padding:"10px",background:"none",border:`1px solid ${C.border}`,
                borderRadius:12,color:C.textMid,fontSize:13,fontWeight:700,fontFamily:FB,cursor:"pointer",
              }}>View your {entries.length} past {entries.length===1?"entry":"entries"} →</button>
            )}
          </div>
        </Fade>
      </div>
    );
  }

  /* ── Writing view ─── */
  if(phase==="write"){
    return(
      <div>
        <BackBar onBack={()=>setPhase("pick")}/>
        <Fade>
          <div style={{marginBottom:18}}>
            <Card style={{background:C.lavenderLight,border:`1.5px solid ${C.lavender}44`,padding:"18px 20px"}}>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{fontSize:28,flexShrink:0}}>{prompt.icon}</div>
                <div>
                  <div style={{color:C.lavender,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Today's prompt</div>
                  <p style={{fontFamily:FD,color:C.text,fontSize:17,lineHeight:1.55,fontWeight:600}}>{prompt.q}</p>
                </div>
              </div>
            </Card>
          </div>
        </Fade>
        <Fade delay={120}>
          <textarea value={text} onChange={e=>setText(e.target.value)}
            placeholder="There's no right way to answer. Start anywhere…"
            rows={10}
            autoFocus
            style={{
              width:"100%",padding:"16px 18px",
              borderRadius:16,
              border:`1.5px solid ${C.border}`,
              background:C.card,
              color:C.text,fontSize:15,fontFamily:FB,
              lineHeight:1.75,outline:"none",resize:"vertical",marginBottom:8,minHeight:180,
            }}
            maxLength={2000}/>
          <div style={{color:C.textMuted,fontSize:11,textAlign:"right",marginBottom:16}}>{text.length}/2000 · private to this device</div>
        </Fade>
        <Fade delay={220}>
          <WarmButton onClick={save} variant="primary" style={{background:C.lavender,borderColor:C.lavender,opacity:text.trim()?1:0.5}}>
            {text.trim()?"Save entry 🌿":"Write something to save"}
          </WarmButton>
          <button onClick={()=>{tapHaptic("light");setPhase("pick");}} style={{display:"block",margin:"12px auto 0",background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:13,fontFamily:FB,textDecoration:"underline"}}>Try a different prompt</button>
        </Fade>
      </div>
    );
  }

  /* ── Saved confirmation ─── */
  if(phase==="saved"){
    return(
      <div style={{textAlign:"center",paddingTop:40}}>
        <Fade>
          <div style={{fontSize:70,marginBottom:14,animation:"journalBloom 0.7s cubic-bezier(0.34,1.56,0.64,1)"}}>🌸</div>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,marginBottom:10}}>Saved</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28,maxWidth:320,margin:"0 auto 28px"}}>Putting feelings into words is itself a kind of care. Your entry stays private on this device.</p>
          <div style={{display:"flex",flexDirection:"column",gap:10,maxWidth:300,margin:"0 auto"}}>
            <WarmButton onClick={()=>{setText("");setPhase("pick");}} variant="secondary">Write another</WarmButton>
            <WarmButton onClick={onDone} variant="sage">Done 🌿</WarmButton>
          </div>
          <style>{`@keyframes journalBloom{0%{transform:scale(0.3);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}`}</style>
        </Fade>
      </div>
    );
  }

  /* ── List of past entries ─── */
  // phase === "list"
  return(
    <div>
      <BackBar onBack={()=>setPhase("pick")}/>
      <Fade>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:44,marginBottom:8}}>📚</div>
          <Pill color={C.lavender}>Your journal</Pill>
          <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 6px"}}>Past entries</h2>
          <p style={{color:C.textMid,fontSize:13,lineHeight:1.6}}>The last {entries.length} entries — private to this device</p>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:18}}>
        {[...entries].reverse().map((e,revIdx)=>{
          const originalIdx=entries.length-1-revIdx;
          const when=new Date(e.when);
          const dateStr=when.toLocaleDateString("en-IN",{day:"numeric",month:"short"})+" · "+when.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"});
          return(
            <Fade key={e.when} delay={revIdx*50}>
              <Card style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:8}}>
                  <div style={{fontSize:22,flexShrink:0}}>{e.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{color:C.lavender,fontWeight:700,fontSize:11,marginBottom:2,textTransform:"uppercase",letterSpacing:0.8}}>{dateStr}</div>
                    <div style={{color:C.text,fontFamily:FD,fontSize:14,fontWeight:600,lineHeight:1.4,marginBottom:8}}>{e.prompt}</div>
                    <p style={{color:C.textMid,fontSize:13,lineHeight:1.7,whiteSpace:"pre-wrap"}}>{e.text}</p>
                  </div>
                  <button onClick={()=>{
                    if(confirm("Delete this entry?")) deleteEntry(originalIdx);
                  }} style={{background:"none",border:"none",color:C.textMuted,fontSize:16,cursor:"pointer",flexShrink:0,padding:"2px 4px"}} title="Delete">✕</button>
                </div>
              </Card>
            </Fade>
          );
        })}
      </div>
      <WarmButton onClick={()=>setPhase("pick")} variant="primary" style={{background:C.lavender,borderColor:C.lavender}}>← Write a new entry</WarmButton>
    </div>
  );
}

/* ─── Feeling categories (Feature 6) ────────────────────────────── */
const FEELINGS = [
  {id:"panicky",   icon:"😰", title:"I feel panicky",      sub:"Racing heart, breathless, overwhelmed",  color:C.rose},
  {id:"sleepless", icon:"🌙", title:"I can't sleep",       sub:"Restless mind, tossing & turning",         color:C.indigo},
  {id:"overthink", icon:"🌀", title:"I'm overthinking",    sub:"Thoughts won't stop, ruminating",          color:C.lavender},
  {id:"empty",     icon:"🕳️", title:"I feel empty",        sub:"Low, unmotivated, numb",                   color:C.sky},
  {id:"angry",     icon:"🔥", title:"I'm angry or tense",  sub:"Irritable, wound-up, on edge",             color:C.peach},
  {id:"all",       icon:"🌿", title:"Browse all exercises",sub:"The full library",                         color:C.sage},
];

/* ─── Expanded exercise library (Feature 6) ─────────────────────── */
const ALL_EXERCISES=[
  /* Panicky / anxious */
  {id:"box",icon:"🫁",title:"Box Breathing",subtitle:"Calm your nervous system in 4 minutes",tags:["panicky","overthink","angry"],color:C.sky,bg:C.skyLight,
    why:"Box breathing activates your parasympathetic nervous system — 'rest and relax' mode — within minutes.",type:"breath",rounds:4,
    steps:[{label:"Breathe In",duration:4,instruction:"Slowly breathe in through your nose",color:C.sky},{label:"Hold",duration:4,instruction:"Hold gently",color:C.lavender},{label:"Breathe Out",duration:4,instruction:"Slowly breathe out",color:C.sage},{label:"Hold",duration:4,instruction:"Hold the empty breath",color:C.amber}]},

  {id:"478",icon:"🌬️",title:"4-7-8 Breathing",subtitle:"A natural tranquiliser",tags:["panicky","sleepless","angry"],color:C.lavender,bg:C.lavenderLight,
    why:"The extended exhale triggers relaxation — especially useful before sleep or during panic.",type:"breath",rounds:4,
    steps:[{label:"Breathe In",duration:4,instruction:"Inhale through your nose",color:C.sky},{label:"Hold",duration:7,instruction:"Hold completely still",color:C.lavender},{label:"Breathe Out",duration:8,instruction:"Exhale fully through your mouth",color:C.sage}]},

  {id:"cool",icon:"❄️",title:"Cool Breath",subtitle:"For sudden panic or heat",tags:["panicky","angry"],color:C.sky,bg:C.skyLight,
    why:"Slow, cooling breath tones down a rising panic response.",type:"breath",rounds:5,
    steps:[{label:"Breathe In",duration:5,instruction:"Inhale slowly through pursed lips — as if sipping air",color:C.sky},{label:"Breathe Out",duration:6,instruction:"Long, soft exhale through your nose",color:C.sage}]},

  {id:"ground",icon:"🌿",title:"5-4-3-2-1 Grounding",subtitle:"Anchor to the present",tags:["panicky","overthink"],color:C.sage,bg:C.sageLight,
    why:"Uses your senses to interrupt anxious thought spirals and bring you back to now.",type:"simple",
    instructions:["Name 5 things you can SEE right now","Touch 4 things — notice how they feel","Listen for 3 sounds in your environment","Notice 2 things you can smell","Notice 1 thing you can taste"]},

  {id:"butterfly",icon:"🦋",title:"Butterfly Hug",subtitle:"Self-soothing bilateral tap",tags:["panicky","empty"],color:C.peach,bg:C.peachLight,
    why:"Bilateral stimulation (used in trauma therapy) helps calm an activated nervous system.",type:"simple",
    instructions:["Cross your arms over your chest — hands on opposite shoulders","Close your eyes if comfortable","Tap your shoulders alternately, slowly: left, right, left, right","Continue for 30–60 seconds at a gentle rhythm","Notice your breath slowing naturally"]},

  /* Sleepless */
  {id:"bodyscan",icon:"🛏️",title:"Body Scan for Sleep",subtitle:"Release tension head to toe",tags:["sleepless","panicky"],color:C.indigo,bg:C.indigoLight,
    why:"A body scan releases accumulated tension and signals your body it's safe to rest.",type:"simple",
    instructions:["Lie down comfortably. Take 3 slow breaths","Notice your face — let your jaw, forehead, and eyes soften","Move awareness to your shoulders — let them drop","Notice your arms — let them feel heavy","Soften your chest and belly with each breath","Notice your hips and legs — let them melt into the bed","Feel your feet — let them be still and warm","Rest in this softness for as long as you like"]},

  {id:"countdown",icon:"🌙",title:"Descending Countdown",subtitle:"Slow your mind to sleep",tags:["sleepless","overthink"],color:C.indigo,bg:C.indigoLight,
    why:"Counting backwards slowly occupies the mind and prevents rumination.",type:"simple",
    instructions:["Lie down. Close your eyes","Start counting backwards from 100","Say each number gently in your mind as you exhale","If your mind wanders, just return to the last number you remember","If you reach 1, start again from 100","The goal isn't to finish — it's to let your mind soften"]},

  /* Overthinking / rumination */
  {id:"leaves",icon:"🍃",title:"Leaves on a Stream",subtitle:"Let thoughts pass",tags:["overthink","empty"],color:C.sage,bg:C.sageLight,
    why:"A classic ACT (Acceptance & Commitment Therapy) practice for not getting hooked by thoughts.",type:"simple",
    instructions:["Imagine sitting beside a gentle stream","Each time a thought arrives, picture placing it on a leaf","Watch the leaf float away down the stream","Don't try to push thoughts away — just keep placing them on leaves","Some leaves drift slowly, some quickly — that's okay","Continue for 2–3 minutes"]},

  {id:"naming",icon:"🔖",title:"Name the Thought",subtitle:"Create distance from rumination",tags:["overthink"],color:C.lavender,bg:C.lavenderLight,
    why:"Naming a thought pattern (e.g. 'this is catastrophising') reduces its grip.",type:"simple",
    instructions:["Notice what thought is looping","Say to yourself: 'I'm noticing the thought that…'","For example: 'I'm noticing the thought that I'm a failure'","This small shift moves you from IN the thought to observing it","Notice — is this thought helpful right now, or just familiar?","You don't have to solve it. Just notice it came by."]},

  /* Empty / low */
  {id:"comp",icon:"💛",title:"Self-Compassion Pause",subtitle:"Speak to yourself kindly",tags:["empty","overthink","angry"],color:C.peach,bg:C.peachLight,
    why:"Reduces the harsh inner criticism that depression amplifies.",type:"simple",
    instructions:["Place a hand on your heart and take a slow breath","Say: 'This is a moment of suffering'","Say: 'Suffering is part of being human — I am not alone'","Say: 'May I be kind to myself in this moment'","Rest here for 60 seconds"]},

  {id:"tinything",icon:"🌱",title:"One Tiny Thing",subtitle:"Behavioural activation",tags:["empty"],color:C.sage,bg:C.sageLight,
    why:"Depression tells you nothing will help. Doing one small thing breaks that spell — it's the core of behavioural activation therapy.",type:"simple",
    instructions:["Pick ONE tiny thing you could do right now","Examples: drink a glass of water · open a window · stretch once · text one person 'hi'","Don't wait until you feel motivated — motivation comes AFTER action","Do the tiny thing now","Notice — even by 5% — how you feel differently","That counts. That's progress."]},

  {id:"gratitude",icon:"🌸",title:"Three Small Gratitudes",subtitle:"Gentle noticing",tags:["empty"],color:C.peach,bg:C.peachLight,
    why:"Noticing small good things rewires attention away from the negative filter depression creates.",type:"simple",
    instructions:["Think of three tiny things from the last 24 hours that weren't terrible","They don't need to be 'meaningful' — small counts","Example: warm tea · a soft pillow · a kind message · a patch of sky","Say each one slowly in your mind","Notice how even tiny good things exist — even on hard days"]},

  /* Angry / tense */
  {id:"release",icon:"💨",title:"Release Breath",subtitle:"Let out the charge",tags:["angry"],color:C.peach,bg:C.peachLight,
    why:"Anger carries physical energy. This helps discharge it safely.",type:"breath",rounds:5,
    steps:[{label:"Breathe In",duration:3,instruction:"Sharp inhale through your nose",color:C.amber},{label:"Breathe Out",duration:6,instruction:"Sigh it out through your mouth — audibly if alone",color:C.sage}]},

  {id:"pmr",icon:"💪",title:"Quick Muscle Release",subtitle:"Tense and relax",tags:["angry","sleepless"],color:C.teal,bg:C.tealLight,
    why:"Progressive muscle relaxation — tense then release — drops physical tension held in the body.",type:"simple",
    instructions:["Clench your fists tightly for 5 seconds, then release","Shrug your shoulders up to your ears for 5 seconds, then drop","Tighten your jaw and face for 5 seconds, then soften","Press your feet into the floor for 5 seconds, then relax","Notice the difference between tense and relaxed","Take three slow breaths"]},
];

function ExercisesScreen({onDone,initialFeeling=null}){
  const [feeling,setFeeling]=useState(initialFeeling);
  const [active,setActive]=useState(null);

  // If user drilled into an exercise
  if(active){
    const ex=ALL_EXERCISES.find(e=>e.id===active);
    return(
      <div>
        <BackBar onBack={()=>setActive(null)} label="Back to exercises"/>
        <Fade>
          <div style={{marginBottom:20}}>
            <div style={{fontSize:44,marginBottom:8}}>{ex.icon}</div>
            <h2 style={{fontFamily:FD,fontSize:24,color:C.text,marginBottom:6}}>{ex.title}</h2>
            <div style={{background:ex.bg,border:`1.5px solid ${ex.color}33`,borderRadius:14,padding:"14px 16px",marginBottom:20}}>
              <div style={{color:ex.color,fontWeight:800,fontSize:13,marginBottom:4}}>💡 Why this helps</div>
              <p style={{color:C.textMid,fontSize:14,lineHeight:1.7}}>{ex.why}</p>
            </div>
          </div>
          {ex.type==="breath"?<BreathingExercise exercise={ex} onDone={()=>setActive(null)}/>:<SimpleExercise exercise={ex} onDone={()=>setActive(null)}/>}
        </Fade>
      </div>
    );
  }

  // If user picked a feeling category — show matching exercises
  if(feeling){
    const f=FEELINGS.find(x=>x.id===feeling);
    const filtered=feeling==="all"?ALL_EXERCISES:ALL_EXERCISES.filter(e=>e.tags.includes(feeling));
    return(
      <div>
        <BackBar onBack={()=>setFeeling(null)} label="Back"/>
        <Fade>
          <div style={{textAlign:"center",marginBottom:22}}>
            <div style={{fontSize:44,marginBottom:8}}>{f.icon}</div>
            <Pill color={f.color}>For when you feel this way</Pill>
            <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 6px"}}>{f.title}</h2>
            <p style={{color:C.textMid,fontSize:13,lineHeight:1.6}}>{filtered.length} {filtered.length===1?"exercise":"exercises"} that can help</p>
          </div>
        </Fade>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
          {filtered.map((ex,i)=>(
            <Fade key={ex.id} delay={i*60}>
              <button onClick={()=>{tapHaptic("light");setActive(ex.id);}} style={{
                display:"flex",alignItems:"center",gap:14,padding:"16px 18px",
                background:C.card,border:`1.5px solid ${C.border}`,borderRadius:18,
                cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s",
              }}>
                <div style={{
                  width:48,height:48,borderRadius:14,
                  background:ex.bg,display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:24,flexShrink:0,
                }}>{ex.icon}</div>
                <div style={{flex:1}}>
                  <div style={{color:C.text,fontWeight:800,fontSize:14,marginBottom:2}}>{ex.title}</div>
                  <div style={{color:C.textSoft,fontSize:12}}>{ex.subtitle}</div>
                  <div style={{color:ex.color,fontSize:10,fontWeight:700,marginTop:3,textTransform:"uppercase",letterSpacing:0.8}}>
                    {ex.type==="breath"?`🫁 ${ex.rounds||4} rounds · ~${Math.round((ex.steps.reduce((s,st)=>s+st.duration,0)*(ex.rounds||4))/60)} min`:`🌿 ${ex.instructions.length} steps`}
                  </div>
                </div>
                <span style={{color:C.textMuted,fontSize:20}}>›</span>
              </button>
            </Fade>
          ))}
        </div>
      </div>
    );
  }

  // Feeling picker (default view)
  return(
    <div>
      <BackBar onBack={onDone} label="Back"/>
      <Fade>
        <div style={{textAlign:"center",marginBottom:26}}>
          <div style={{fontSize:52,marginBottom:10}}>🌿</div>
          <Pill color={C.sage}>Calm down</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 8px"}}>How are you feeling?</h2>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.7,maxWidth:320,margin:"0 auto"}}>Pick what fits, and we'll suggest exercises that can help right now.</p>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {FEELINGS.map((f,i)=>(
          <Fade key={f.id} delay={i*70}>
            <button onClick={()=>{tapHaptic("light");setFeeling(f.id);}} style={{
              display:"flex",alignItems:"center",gap:14,padding:"16px 18px",
              background:`linear-gradient(135deg,${f.color}0e 0%,#ffffff 100%)`,
              border:`1.5px solid ${f.color}44`,borderRadius:18,
              cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s",
            }}>
              <div style={{
                width:48,height:48,borderRadius:14,
                background:f.color+"22",display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:26,flexShrink:0,
              }}>{f.icon}</div>
              <div style={{flex:1}}>
                <div style={{color:f.color,fontWeight:800,fontSize:15,marginBottom:1}}>{f.title}</div>
                <div style={{color:C.textSoft,fontSize:12}}>{f.sub}</div>
              </div>
              <span style={{color:f.color,fontSize:20}}>›</span>
            </button>
          </Fade>
        ))}
      </div>
    </div>
  );
}

/* ─── Actionable next step generator ─────────────────────────────── */
function getActionableNextStep(phq9,gad7,duration,medical){
  if(phq9>=20||gad7>=15) return {
    action:"Please call iCall today: 9152987821",
    why:"Your scores suggest urgent support is needed. The call is free, confidential, and one phone call can change your day.",
    urgency:"urgent",
  };
  if(phq9>=15||gad7>=12) return {
    action:"Book a psychiatrist appointment this week",
    why:"Your symptoms are significant. Don't wait for them to worsen — professional help can help you feel noticeably better within weeks.",
    urgency:"high",
  };
  if(phq9>=10||gad7>=10) return {
    action:"Speak to your GP in the next 7 days",
    why:"Your family doctor can assess you and either start treatment or refer you to a specialist. This is the easiest first step.",
    urgency:"moderate",
  };
  if(phq9>=5||gad7>=5) return {
    action:"Text or call one trusted person today",
    why:"Sharing how you're feeling with someone you trust is a small but powerful step. You don't need to explain everything — just open the conversation.",
    urgency:"low",
  };
  return {
    action:"Keep checking in with yourself weekly",
    why:"Your scores are in the minimal range. Continue daily self-care practices and return here if things change.",
    urgency:"maintain",
  };
}

/* ─── Domain breakdown ───────────────────────────────────────────── */
function DomainBreakdown({answers,scale}){
  if(!answers||!answers.length) return null;
  const items=scale==="PHQ-9"?PHQ9:GAD7;
  // Get top 3 driving symptoms (highest scores)
  const indexed=answers.map((val,i)=>({val:val==="skip"?0:val,item:items[i],skipped:val==="skip"})).filter(x=>!x.skipped);
  const sorted=[...indexed].sort((a,b)=>b.val-a.val);
  const top=sorted.filter(x=>x.val>=2).slice(0,3);
  if(!top.length) return(
    <Card style={{marginBottom:14,background:C.sageLight,border:`1.5px solid ${C.sage}44`}}>
      <div style={{color:C.sage,fontWeight:800,fontSize:14,marginBottom:6}}>🌱 {scale} breakdown</div>
      <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}>No specific symptoms are standing out — your responses are evenly spread.</p>
    </Card>
  );
  return(
    <Card style={{marginBottom:14}}>
      <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}>What's driving your {scale} score</div>
      {top.map((x,i)=>{
        const domain=PHQ9_DOMAINS[x.item.domain]||{label:x.item.domain,icon:"•",color:C.textMid};
        const intensity=x.val===3?"every day":x.val===2?"frequently":"sometimes";
        return(
          <div key={i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<top.length-1?`1px solid ${C.border}`:"none"}}>
            <span style={{fontSize:20}}>{domain.icon}</span>
            <div style={{flex:1}}>
              <div style={{color:domain.color,fontWeight:800,fontSize:13}}>{domain.label}</div>
              <div style={{color:C.textMid,fontSize:12,lineHeight:1.5,marginTop:2}}>Experienced {intensity} over the last 2 weeks</div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

/* ─── Score trend chart ──────────────────────────────────────────── */
function ScoreTrendChart({history}){
  if(!history||history.length<2) return null;
  const data=history.slice(-5); // last 5 assessments
  const maxScore=27;
  const W=300, H=120, padding=20;
  // Compute path for PHQ9 and GAD7
  const phq9Points=data.map((entry,i)=>({
    x:padding+(i*(W-2*padding))/Math.max(data.length-1,1),
    y:H-padding-((entry.phq9/maxScore)*(H-2*padding)),
  }));
  const gad7Points=data.map((entry,i)=>({
    x:padding+(i*(W-2*padding))/Math.max(data.length-1,1),
    y:H-padding-((entry.gad7/21)*(H-2*padding)),
  }));
  const phq9Path=phq9Points.map((p,i)=>`${i===0?"M":"L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const gad7Path=gad7Points.map((p,i)=>`${i===0?"M":"L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const first=data[0], last=data[data.length-1];
  const phq9Delta=last.phq9-first.phq9;
  const gad7Delta=last.gad7-first.gad7;
  const improved=phq9Delta<0||gad7Delta<0;

  return(
    <Card style={{marginBottom:14}}>
      <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}>📈 Your progress</div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto"}}>
        <path d={phq9Path} stroke={C.sky} strokeWidth="2.5" fill="none"/>
        <path d={gad7Path} stroke={C.sage} strokeWidth="2.5" fill="none"/>
        {phq9Points.map((p,i)=><circle key={"p"+i} cx={p.x} cy={p.y} r="5" fill={C.sky}/>)}
        {gad7Points.map((p,i)=><circle key={"g"+i} cx={p.x} cy={p.y} r="5" fill={C.sage}/>)}
      </svg>
      <div style={{display:"flex",gap:14,marginTop:10,fontSize:12}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:14,height:3,background:C.sky,borderRadius:2}}/><span style={{color:C.textMid}}>Depression</span></div>
        <div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:14,height:3,background:C.sage,borderRadius:2}}/><span style={{color:C.textMid}}>Anxiety</span></div>
      </div>
      <div style={{marginTop:12,padding:"10px 12px",background:improved?C.sageLight:C.amberLight,borderRadius:10,fontSize:13,color:improved?C.sage:C.amber,fontWeight:700}}>
        {improved?`🌱 You're moving in the right direction — keep going.`:`🌿 Your scores have stayed steady or risen. Please keep reaching out for support.`}
      </div>
    </Card>
  );
}

/* ─── Normalisation comparison ───────────────────────────────────── */
function ComparisonCard({phq9,gad7}){
  let msg="";
  if(phq9<=4&&gad7<=4) msg="Your scores are similar to most people in the general population. Continue nurturing your wellbeing.";
  else if(phq9<=9&&gad7<=9) msg="Your scores are similar to roughly 1 in 4 adults at any given time. This is very common and very treatable.";
  else if(phq9<=14||gad7<=14) msg="Your scores are similar to the average person who sees a GP for mental health. This is a common and treatable range — you're in the right place for getting help.";
  else msg="Your scores are similar to people who seek help from a psychiatrist. Significant symptoms at this level are very treatable with the right care — most people see meaningful improvement within weeks to months.";
  return(
    <Card style={{marginBottom:14,background:C.peachLight,border:`1.5px solid ${C.peach}33`}}>
      <div style={{color:C.peach,fontWeight:800,fontSize:13,marginBottom:6}}>🤝 You're not alone</div>
      <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>{msg}</p>
    </Card>
  );
}

/* ─── Results screen ─────────────────────────────────────────────── */
function ResultScreen({data,history,onExercises,onFAQ,onLearn,onPDF,onJournal,onRetake}){
  const {phq9,gad7,phq9answers,gad7answers,phq15,mdq,trauma,sleep,psychosis,functional,medical,duration,profile,safety,meds}=data;
  const dep=phq9<=4?{label:"Minimal",color:C.sage,icon:"🌱"}:phq9<=9?{label:"Mild",color:C.sky,icon:"🌤️"}:phq9<=14?{label:"Moderate",color:C.amber,icon:"🌧️"}:phq9<=19?{label:"Moderately Severe",color:C.peach,icon:"🌩️"}:{label:"Severe",color:C.rose,icon:"⛈️"};
  const anx=gad7<=4?{label:"Minimal",color:C.sage,icon:"🌱"}:gad7<=9?{label:"Mild",color:C.sky,icon:"🌤️"}:gad7<=14?{label:"Moderate",color:C.amber,icon:"🌧️"}:{label:"Severe",color:C.rose,icon:"⛈️"};
  const isCrisis=phq9>=20||gad7>=15||safety?.level>=3;
  const allGood=phq9<=4&&gad7<=4;
  const hasBipolarFlag=mdq?.positive;
  const hasPTSD=trauma?.positive;
  const hasPsychosis=psychosis?.flag;
  const poorSleep=sleep?.poor;
  const highSomatic=phq15>=10;
  const chronicDuration=["chronic","longterm"].includes(duration?.duration);
  const functionalAvg=functional?Math.round(Object.values(functional).filter(v=>v!==null).reduce((a,b)=>a+b,0)/3):null;
  const nextStep=getActionableNextStep(phq9,gad7,duration,medical);
  const hasAnyFlags=hasBipolarFlag||hasPTSD||hasPsychosis||poorSleep||highSomatic||functionalAvg>=6;
  const [showClinical,setShowClinical]=useState(false);
  const [showFlags,setShowFlags]=useState(false);
  const [showMeds,setShowMeds]=useState(false);
  const clinical=buildClinicalImpression(data);

  // Staged reveal
  const [revealPhase,setRevealPhase]=useState(0);
  useEffect(()=>{
    const timers=[
      setTimeout(()=>setRevealPhase(1),250),
      setTimeout(()=>setRevealPhase(2),700),
      setTimeout(()=>setRevealPhase(3),1150),
      setTimeout(()=>setRevealPhase(4),1600),
    ];
    return()=>timers.forEach(clearTimeout);
  },[]);

  // Warm summary title
  const heroTitle = allGood ? "You're doing okay"
    : isCrisis ? "We hear you — you're not alone"
    : (phq9>=10&&gad7>=10) ? "There's a lot on your shoulders"
    : phq9>=10 ? "Your heart is carrying something"
    : gad7>=10 ? "Your mind has been busy"
    : "Here's what we noticed";

  const heroMessage = allGood ? "Your answers suggest low levels of depression and anxiety right now. Keep checking in."
    : isCrisis ? "What you're going through matters. These results suggest you deserve real support — today, not later."
    : "These results are a starting point, not a final label. Let's look at what they say together.";

  const heroColor = isCrisis ? C.rose : allGood ? C.sage : C.peach;

  return(
    <div>
      {/* ── HERO ── */}
      <div style={{textAlign:"center",marginTop:12,marginBottom:26}}>
        <div style={{
          fontSize:72,marginBottom:10,
          opacity:revealPhase>=1?1:0,
          transform:revealPhase>=1?"scale(1)":"scale(0.4)",
          transition:"all 0.7s cubic-bezier(0.34,1.56,0.64,1)",
        }}>{allGood?"🌸":isCrisis?"💙":"🫂"}</div>
        <div style={{
          opacity:revealPhase>=1?1:0,
          transform:revealPhase>=1?"translateY(0)":"translateY(12px)",
          transition:"all 0.5s ease 0.15s",
        }}>
          <Pill color={heroColor}>Your check-in</Pill>
          <h2 style={{fontFamily:FD,fontSize:28,color:C.text,margin:"14px 0 10px",lineHeight:1.3}}>{heroTitle}</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,maxWidth:340,margin:"0 auto"}}>{heroMessage}</p>
          {chronicDuration&&<div style={{marginTop:14,background:C.amberLight,border:`1px solid ${C.amber}44`,borderRadius:10,padding:"7px 14px",fontSize:12,color:C.amber,fontWeight:700,display:"inline-block"}}>⏱️ {duration.duration==="chronic"?"3–12 months":"Over 1 year"} · chronic presentation</div>}
        </div>
      </div>

      {/* ── CRISIS BANNER (always first if crisis) ── */}
      {isCrisis&&(
        <div style={{
          opacity:revealPhase>=1?1:0,
          transform:revealPhase>=1?"translateY(0)":"translateY(14px)",
          transition:"all 0.6s ease 0.3s",
        }}>
          <Card style={{marginBottom:16,background:C.roseLight,border:`2px solid ${C.rose}`}}>
            <p style={{color:C.rose,fontWeight:800,fontSize:15,marginBottom:8}}>💙 Please reach out today</p>
            <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:12}}>You don't have to carry this alone. These lines are free, confidential, and will listen without judgement.</p>
            <div style={{color:C.text,fontSize:13,fontWeight:700,lineHeight:2.1}}>
              📞 <a href="tel:9152987821" style={{color:C.rose}}>iCall: 9152987821</a><br/>
              📞 <a href="tel:18602662345" style={{color:C.rose}}>Vandrevala 24/7: 1860-2662-345</a><br/>
              📞 <a href="tel:08046110007" style={{color:C.rose}}>NIMHANS: 080-46110007</a>
            </div>
          </Card>
        </div>
      )}

      {/* ── SCORES (two cards) ── */}
      <div style={{
        display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16,
        opacity:revealPhase>=2?1:0,
        transform:revealPhase>=2?"translateY(0)":"translateY(14px)",
        transition:"all 0.6s ease",
      }}>
        {[{label:"Mood",sub:"PHQ-9",score:phq9,max:27,level:dep},{label:"Worry",sub:"GAD-7",score:gad7,max:21,level:anx}].map(({label,sub,score,max,level})=>(
          <div key={sub} style={{
            background:`linear-gradient(135deg,${level.color}14 0%,${level.color}05 100%)`,
            border:`1.5px solid ${level.color}44`,
            borderRadius:20,padding:"18px 14px",textAlign:"center",
          }}>
            <div style={{fontSize:30,marginBottom:4}}>{level.icon}</div>
            <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:3}}>{label} <span style={{opacity:0.6,fontWeight:700}}>· {sub}</span></div>
            <div style={{color:level.color,fontWeight:800,fontSize:26,fontFamily:FD,lineHeight:1}}>{score}<span style={{fontSize:13,color:C.textMuted,fontFamily:FB}}>/{max}</span></div>
            <div style={{background:level.color+"22",color:level.color,fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20,display:"inline-block",marginTop:8}}>{level.label}</div>
          </div>
        ))}
      </div>

      {/* ── HERO CTA: the "what now" moment ── */}
      <div style={{
        opacity:revealPhase>=3?1:0,
        transform:revealPhase>=3?"translateY(0)":"translateY(14px)",
        transition:"all 0.6s ease",
        marginBottom:14,
      }}>
        <div style={{
          background:`linear-gradient(135deg,${clinical.tier.color} 0%,${clinical.tier.color}dd 100%)`,
          borderRadius:24,
          padding:"22px 22px 20px",
          color:C.white,
          boxShadow:`0 10px 30px ${clinical.tier.color}55`,
          position:"relative",overflow:"hidden",
        }}>
          <div style={{position:"absolute",top:-40,right:-40,width:150,height:150,borderRadius:"50%",background:"rgba(255,255,255,0.1)"}}/>
          <div style={{position:"absolute",bottom:-20,left:-20,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.08)"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:44,height:44,borderRadius:14,background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,backdropFilter:"blur(4px)"}}>{clinical.tier.icon}</div>
              <div>
                <div style={{fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,opacity:0.92}}>Your one next step</div>
                <div style={{fontSize:12,opacity:0.85,fontWeight:700}}>Tier {clinical.tier.level} · {clinical.tier.label}</div>
              </div>
            </div>
            <p style={{fontFamily:FD,fontSize:19,fontWeight:600,lineHeight:1.45,marginBottom:10}}>{nextStep.action}</p>
            <p style={{fontSize:13,lineHeight:1.7,opacity:0.92,marginBottom:14}}>{nextStep.why}</p>
            <div style={{display:"flex",flexDirection:"column",gap:7,background:"rgba(255,255,255,0.15)",borderRadius:14,padding:"12px 14px",backdropFilter:"blur(4px)"}}>
              <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1,opacity:0.92}}>Typically this looks like</div>
              <div style={{fontSize:13,lineHeight:1.6}}><strong>Where:</strong> {clinical.tierDetail.path}</div>
              <div style={{fontSize:13,lineHeight:1.6}}><strong>How:</strong> {clinical.tierDetail.modality}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trend chart if multiple ── */}
      {history&&history.length>=2 && (
        <div style={{
          opacity:revealPhase>=4?1:0,
          transform:revealPhase>=4?"translateY(0)":"translateY(14px)",
          transition:"all 0.5s ease",
        }}>
          <ScoreTrendChart history={history}/>
        </div>
      )}

      {/* ── Normalisation ── */}
      {!allGood && (
        <div style={{
          opacity:revealPhase>=4?1:0,
          transform:revealPhase>=4?"translateY(0)":"translateY(14px)",
          transition:"all 0.5s ease 0.1s",
        }}>
          <ComparisonCard phq9={phq9} gad7={gad7}/>
        </div>
      )}

      {/* ── Expandable: clinical flags ── */}
      {hasAnyFlags && (
        <div style={{
          opacity:revealPhase>=4?1:0,
          transform:revealPhase>=4?"translateY(0)":"translateY(14px)",
          transition:"all 0.5s ease 0.15s",
        }}>
          <button onClick={()=>{tapHaptic("light");setShowFlags(s=>!s);}} style={{
            width:"100%",padding:"14px 18px",background:C.amberLight,
            border:`1.5px solid ${C.amber}55`,borderRadius:16,
            cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",gap:10,marginBottom:showFlags?10:14,
          }}>
            <span style={{fontSize:22}}>⚠️</span>
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{color:C.amber,fontWeight:800,fontSize:13}}>Additional clinical flags</div>
              <div style={{color:C.textSoft,fontSize:11}}>Things your doctor should know · tap to {showFlags?"hide":"view"}</div>
            </div>
            <span style={{color:C.amber,fontSize:18,transform:showFlags?"rotate(90deg)":"rotate(0)",transition:"transform 0.2s"}}>›</span>
          </button>
          {showFlags && (
            <Card style={{marginBottom:14}}>
              {hasBipolarFlag&&<FlagRow icon="🌓" color={C.lavender} title="Possible bipolar spectrum" text="Your MDQ responses suggest possible bipolar spectrum symptoms. Please discuss with your psychiatrist — this affects treatment choice."/>}
              {hasPTSD&&<FlagRow icon="🌪️" color={C.rose} title="Possible PTSD" text="Your trauma screen suggests possible PTSD symptoms. Trauma-focused therapy (EMDR, Prolonged Exposure) is highly effective."/>}
              {hasPsychosis&&<FlagRow icon="🧠" color={C.teal} title="Perceptual experiences noted" text="You reported some unusual perceptual experiences. These can have many causes. Please discuss with a psychiatrist."/>}
              {poorSleep&&<FlagRow icon="😴" color={C.indigo} title="Poor sleep quality" text="Addressing sleep often significantly improves mood and anxiety."/>}
              {highSomatic&&<FlagRow icon="🫄" color={C.amber} title="Significant physical symptoms" text="These may be related to your mental health. Very common in Indian presentations of depression."/>}
              {functionalAvg>=6&&<FlagRow icon="💼" color={C.peach} title="Significant functional impairment" text={`Average impact: ${functionalAvg}/10. This level supports prioritising professional help.`}/>}
            </Card>
          )}
        </div>
      )}

      {/* ── Expandable: medication flags ── */}
      {clinical.medFlags.length>0 && (
        <div style={{
          opacity:revealPhase>=4?1:0,
          transform:revealPhase>=4?"translateY(0)":"translateY(14px)",
          transition:"all 0.5s ease 0.2s",
        }}>
          <button onClick={()=>{tapHaptic("light");setShowMeds(s=>!s);}} style={{
            width:"100%",padding:"14px 18px",background:C.tealLight,
            border:`1.5px solid ${C.teal}55`,borderRadius:16,
            cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",gap:10,marginBottom:showMeds?10:14,
          }}>
            <span style={{fontSize:22}}>💊</span>
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{color:C.teal,fontWeight:800,fontSize:13}}>Medication interactions ({clinical.medFlags.length})</div>
              <div style={{color:C.textSoft,fontSize:11}}>Some of your meds may affect mood · tap to {showMeds?"hide":"view"}</div>
            </div>
            <span style={{color:C.teal,fontSize:18,transform:showMeds?"rotate(90deg)":"rotate(0)",transition:"transform 0.2s"}}>›</span>
          </button>
          {showMeds && (
            <Card style={{marginBottom:14,background:C.tealLight,border:`1.5px solid ${C.teal}55`}}>
              <p style={{color:C.textMid,fontSize:12,lineHeight:1.65,marginBottom:10,fontStyle:"italic"}}>Share these with your doctor — <strong>do not stop any medication without medical advice.</strong></p>
              {clinical.medFlags.map((m,i)=>(
                <div key={i} style={{padding:"10px 0",borderBottom:i<clinical.medFlags.length-1?`1px solid ${C.border}`:"none"}}>
                  <div style={{fontWeight:800,fontSize:13,color:m.severity==="high"?C.rose:C.amber,marginBottom:3}}>
                    {m.severity==="high"?"⚠️":"💛"} {m.label}
                  </div>
                  {m.note && <div style={{color:C.textMid,fontSize:12,lineHeight:1.55}}>{m.note}</div>}
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      {/* ── Expandable: clinical impression (ICD/DSM/diffs) ── */}
      <div style={{
        opacity:revealPhase>=4?1:0,
        transform:revealPhase>=4?"translateY(0)":"translateY(14px)",
        transition:"all 0.5s ease 0.25s",
      }}>
        <button onClick={()=>{tapHaptic("light");setShowClinical(s=>!s);}} style={{
          width:"100%",padding:"14px 18px",background:C.indigoLight,
          border:`1.5px solid ${C.indigo}44`,borderRadius:16,
          cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",gap:10,marginBottom:showClinical?10:14,
        }}>
          <span style={{fontSize:22}}>🩺</span>
          <div style={{flex:1,textAlign:"left"}}>
            <div style={{color:C.indigo,fontWeight:800,fontSize:13}}>Clinical impression (for your doctor)</div>
            <div style={{color:C.textSoft,fontSize:11}}>ICD-11, DSM-5, differentials · tap to {showClinical?"hide":"view"}</div>
          </div>
          <span style={{color:C.indigo,fontSize:18,transform:showClinical?"rotate(90deg)":"rotate(0)",transition:"transform 0.2s"}}>›</span>
        </button>
        {showClinical && (
          <Card style={{marginBottom:14,padding:"18px 20px"}}>
            <div style={{marginBottom:12}}>
              <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Primary impression</div>
              <p style={{color:C.text,fontWeight:700,fontSize:14,lineHeight:1.55,fontFamily:FD}}>{clinical.primary}</p>
            </div>
            <div style={{marginBottom:12,padding:"10px 12px",background:C.bg,borderRadius:10}}>
              <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>ICD-11</div>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.55,fontFamily:"monospace"}}>{clinical.icd11}</p>
            </div>
            <div style={{marginBottom:12,padding:"10px 12px",background:C.bg,borderRadius:10}}>
              <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>DSM-5</div>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.55,fontFamily:"monospace"}}>{clinical.dsm5}</p>
            </div>
            <div>
              <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Differentials to rule out</div>
              {clinical.diffs.map((d,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:4}}>
                  <span style={{color:C.indigo,fontWeight:800,fontSize:12}}>{i+1}.</span>
                  <span style={{color:C.textMid,fontSize:13,lineHeight:1.55}}>{d}</span>
                </div>
              ))}
            </div>
            <div style={{marginTop:14,padding:"10px 12px",background:C.amberLight,border:`1px solid ${C.amber}33`,borderRadius:10}}>
              <p style={{color:C.textMid,fontSize:11,lineHeight:1.55,fontStyle:"italic"}}>This is an automated impression based on screening responses. It is not a diagnosis. Clinical correlation and formal assessment by a qualified professional are essential.</p>
            </div>
          </Card>
        )}
      </div>

      {/* ── Domain breakdown ── */}
      {phq9answers && phq9answers.length>0 && (
        <div style={{
          opacity:revealPhase>=4?1:0,
          transform:revealPhase>=4?"translateY(0)":"translateY(14px)",
          transition:"all 0.5s ease 0.3s",
        }}>
          <DomainBreakdown answers={phq9answers} scale="PHQ-9"/>
        </div>
      )}

      {/* ── Things you can do now ── */}
      <div style={{
        opacity:revealPhase>=4?1:0,
        transform:revealPhase>=4?"translateY(0)":"translateY(14px)",
        transition:"all 0.5s ease 0.35s",
      }}>
        <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginTop:18,marginBottom:10}}>Things you can do right now</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={onPDF} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.indigo}55`,background:`linear-gradient(135deg,${C.indigoLight} 0%,#eff1fc 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:C.indigo,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📄</div>
            <div style={{flex:1}}><div style={{color:C.indigo,fontWeight:800,fontSize:14,marginBottom:1}}>Download your report</div><div style={{color:C.textMid,fontSize:11}}>Share with your doctor before the visit</div></div>
            <span style={{color:C.indigo,fontSize:20}}>›</span>
          </button>
          <button onClick={()=>onExercises()} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.sage}55`,background:`linear-gradient(135deg,${C.sageLight} 0%,#f0faf4 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:C.sage,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🌿</div>
            <div style={{flex:1}}><div style={{color:C.sage,fontWeight:800,fontSize:14,marginBottom:1}}>Try a calming exercise</div><div style={{color:C.textMid,fontSize:11}}>Breathing, grounding & more — right now</div></div>
            <span style={{color:C.sage,fontSize:20}}>›</span>
          </button>
          {onJournal && (
            <button onClick={onJournal} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.lavender}55`,background:`linear-gradient(135deg,${C.lavenderLight} 0%,#f6f2fc 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:13,background:C.lavender,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📖</div>
              <div style={{flex:1}}><div style={{color:C.lavender,fontWeight:800,fontSize:14,marginBottom:1}}>Write it out</div><div style={{color:C.textMid,fontSize:11}}>Gentle journaling prompts · private to you</div></div>
              <span style={{color:C.lavender,fontSize:20}}>›</span>
            </button>
          )}
          <button onClick={onFAQ} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.sky}55`,background:`linear-gradient(135deg,${C.skyLight} 0%,#f0f6ff 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:C.sky,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💬</div>
            <div style={{flex:1}}><div style={{color:C.sky,fontWeight:800,fontSize:14,marginBottom:1}}>Common questions</div><div style={{color:C.textMid,fontSize:11}}>Personalised to your results</div></div>
            <span style={{color:C.sky,fontSize:20}}>›</span>
          </button>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
          <WarmButton onClick={onLearn} variant="secondary">📚 Learn about mental health</WarmButton>
          <WarmButton onClick={onRetake} variant="ghost">↩ Start over (saves current as history)</WarmButton>
        </div>

        <div style={{background:C.amberLight,border:`1px solid ${C.amber}33`,borderRadius:12,padding:"10px 14px",marginTop:18}}>
          <p style={{color:C.textMid,fontSize:11,lineHeight:1.65}}>⚠️ <strong>Reminder:</strong> This is a screening aid, not a clinical diagnosis. Always discuss results with a qualified professional.</p>
        </div>
      </div>
    </div>
  );
}

function FlagRow({icon,color,title,text}){
  return(
    <div style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:18}}>{icon}</span>
      <div>
        <div style={{color,fontWeight:800,fontSize:13}}>{title}</div>
        <div style={{color:C.textMid,fontSize:12,lineHeight:1.55}}>{text}</div>
      </div>
    </div>
  );
}

/* ─── PDF Report (printable HTML page) ───────────────────────────── */
function PDFReport({data,history,onBack}){
  const {phq9,gad7,phq9answers,gad7answers,phq15,mdq,trauma,sleep,psychosis,functional,medical,duration,profile,safety,meds}=data;
  const dep=phq9<=4?"Minimal":phq9<=9?"Mild":phq9<=14?"Moderate":phq9<=19?"Moderately Severe":"Severe";
  const anx=gad7<=4?"Minimal":gad7<=9?"Mild":gad7<=14?"Moderate":"Severe";
  const functionalAvg=functional?Math.round(Object.values(functional).filter(v=>v!==null).reduce((a,b)=>a+b,0)/3):null;
  const date=new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'});
  const clinical=buildClinicalImpression(data);

  const handlePrint=()=>{
    window.print();
  };

  return(
    <div>
      <BackBar onBack={onBack} label="Back to results"/>
      <Fade>
        <div style={{marginBottom:18,display:"flex",gap:10}}>
          <WarmButton onClick={handlePrint} variant="indigo">🖨️ Print / Save as PDF</WarmButton>
        </div>
        <p style={{color:C.textSoft,fontSize:12,textAlign:"center",marginBottom:20,lineHeight:1.6}}>Tip: In the print dialog, choose "Save as PDF" to get a shareable file. Then attach or WhatsApp it to your doctor.</p>
      </Fade>

      <div className="pdf-report" style={{background:C.white,border:`1px solid ${C.border}`,borderRadius:16,padding:"28px 24px",fontFamily:FB,color:C.text}}>
        <div style={{borderBottom:`2px solid ${C.peach}`,paddingBottom:14,marginBottom:18}}>
          <h1 style={{fontFamily:FD,fontSize:22,color:C.peach,marginBottom:4}}>🌸 ManaScreen Clinical Summary</h1>
          <p style={{color:C.textMid,fontSize:12}}>Generated on {date} · For use by patient and their healthcare provider</p>
        </div>

        <section style={{marginBottom:14}}>
          <h2 style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:C.textSoft,marginBottom:6}}>Patient Profile</h2>
          <table style={{width:"100%",fontSize:13,lineHeight:1.7}}>
            <tbody>
              <tr><td style={{color:C.textSoft,width:"40%"}}>Age group:</td><td>{profile?.ageGroup||"—"}</td></tr>
              <tr><td style={{color:C.textSoft}}>Gender:</td><td>{profile?.gender||"—"}</td></tr>
              <tr><td style={{color:C.textSoft}}>Duration of symptoms:</td><td>{duration?.duration||"—"}</td></tr>
              <tr><td style={{color:C.textSoft}}>Onset:</td><td>{duration?.onset||"—"}</td></tr>
            </tbody>
          </table>
        </section>

        <section style={{marginBottom:14,background:C.skyLight,borderRadius:10,padding:"12px 14px"}}>
          <h2 style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:C.sky,marginBottom:8}}>Primary Screening Results</h2>
          <table style={{width:"100%",fontSize:13,lineHeight:1.9}}>
            <tbody>
              <tr><td><strong>PHQ-9 (Depression):</strong></td><td style={{textAlign:"right"}}><strong>{phq9}/27</strong> — {dep}</td></tr>
              <tr><td><strong>GAD-7 (Anxiety):</strong></td><td style={{textAlign:"right"}}><strong>{gad7}/21</strong> — {anx}</td></tr>
              {functionalAvg!==null&&<tr><td><strong>Functional impairment:</strong></td><td style={{textAlign:"right"}}><strong>{functionalAvg}/10</strong></td></tr>}
              {safety&&safety.level>0&&<tr><td><strong>C-SSRS level:</strong></td><td style={{textAlign:"right",color:C.rose}}><strong>Level {safety.level}</strong> {safety.safe?"(low)":"(requires attention)"}</td></tr>}
            </tbody>
          </table>
        </section>

        <section style={{marginBottom:14,background:C.indigoLight,borderRadius:10,padding:"12px 14px"}}>
          <h2 style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:C.indigo,marginBottom:8}}>Clinical Impression (Automated)</h2>
          <p style={{fontSize:13,lineHeight:1.7,marginBottom:8}}><strong>Primary:</strong> {clinical.primary}</p>
          <p style={{fontSize:12,lineHeight:1.65,marginBottom:6,fontFamily:"monospace"}}><strong>ICD-11:</strong> {clinical.icd11}</p>
          <p style={{fontSize:12,lineHeight:1.65,marginBottom:10,fontFamily:"monospace"}}><strong>DSM-5:</strong> {clinical.dsm5}</p>
          <div>
            <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>Differentials to consider:</div>
            <ul style={{fontSize:12,lineHeight:1.7,paddingLeft:18,margin:0}}>
              {clinical.diffs.map((d,i)=><li key={i}>{d}</li>)}
            </ul>
          </div>
        </section>

        <section style={{marginBottom:14,background:clinical.tier.color+"15",borderRadius:10,padding:"12px 14px",border:`1.5px solid ${clinical.tier.color}55`}}>
          <h2 style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:clinical.tier.color,marginBottom:8}}>Recommended Care Pathway</h2>
          <p style={{fontSize:14,fontWeight:800,marginBottom:8}}>Tier {clinical.tier.level}: {clinical.tier.label}</p>
          <table style={{width:"100%",fontSize:12,lineHeight:1.75}}>
            <tbody>
              <tr><td style={{width:"30%",verticalAlign:"top"}}><strong>Action:</strong></td><td>{clinical.tierDetail.action}</td></tr>
              <tr><td style={{verticalAlign:"top"}}><strong>Setting:</strong></td><td>{clinical.tierDetail.path}</td></tr>
              <tr><td style={{verticalAlign:"top"}}><strong>Approach:</strong></td><td>{clinical.tierDetail.modality}</td></tr>
            </tbody>
          </table>
        </section>

        {clinical.medFlags.length>0 && (
          <section style={{marginBottom:14,background:C.tealLight,borderRadius:10,padding:"12px 14px",border:`1.5px solid ${C.teal}55`}}>
            <h2 style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:C.teal,marginBottom:8}}>⚠️ Medications Affecting Mood</h2>
            <p style={{fontSize:11,fontStyle:"italic",color:C.textMid,marginBottom:8}}>Patient is taking medications that may contribute to mood symptoms. Consider in clinical formulation.</p>
            <ul style={{fontSize:12,lineHeight:1.7,paddingLeft:18,margin:0}}>
              {clinical.medFlags.map((m,i)=><li key={i}><strong>{m.label}</strong>{m.note?` — ${m.note}`:""}</li>)}
            </ul>
          </section>
        )}

        {(mdq?.positive||trauma?.positive||psychosis?.flag||sleep?.poor||phq15>=10)&&(
          <section style={{marginBottom:14,background:C.amberLight,borderRadius:10,padding:"12px 14px"}}>
            <h2 style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:C.amber,marginBottom:8}}>Clinical Flags</h2>
            <ul style={{fontSize:13,lineHeight:1.75,paddingLeft:18}}>
              {mdq?.positive&&<li>Positive MDQ screen ({mdq.yesCount}/13 items, clustered, {mdq.impact>=2?"moderate+":"mild"} impact) — consider bipolar spectrum evaluation</li>}
              {trauma?.positive&&<li>Positive PC-PTSD-5 ({trauma.score}/5) — consider PTSD evaluation</li>}
              {psychosis?.flag&&<li>Positive psychosis screen — perceptual experiences reported</li>}
              {sleep?.poor&&<li>Poor sleep quality (PSQI brief score {sleep.score})</li>}
              {phq15>=10&&<li>Significant somatic symptoms (PHQ-15 ≥10) — somatization component likely</li>}
            </ul>
          </section>
        )}

        {medical&&Object.values(medical).some(v=>v==="Yes")&&(
          <section style={{marginBottom:14}}>
            <h2 style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:C.textSoft,marginBottom:6}}>Relevant Medical History</h2>
            <ul style={{fontSize:13,lineHeight:1.7,paddingLeft:18}}>
              {medical.thyroid==="Yes"&&<li>Known thyroid condition</li>}
              {medical.meds==="Yes"&&<li>Currently on regular medications</li>}
              {medical.substances==="Yes"&&<li>Regular substance use reported</li>}
              {medical.chronic==="Yes"&&<li>Chronic physical illness</li>}
              {medical.head==="Yes"&&<li>History of head injury / neurological condition</li>}
              {medical.family==="Yes"&&<li>Family history of depression, anxiety, or bipolar disorder</li>}
            </ul>
          </section>
        )}

        <section style={{marginBottom:14}}>
          <h2 style={{fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,color:C.textSoft,marginBottom:6}}>Instruments Used</h2>
          <p style={{fontSize:12,lineHeight:1.7,color:C.textMid}}>PHQ-9 (Kroenke 2001) · GAD-7 (Spitzer 2006){phq15!==undefined?" · PHQ-15 (Kroenke 2002)":""}{mdq?" · MDQ (Hirschfeld 2000)":""}{trauma&&!trauma.skipped?" · PC-PTSD-5 (Prins 2016)":""}{sleep?" · PSQI-Brief (Buysse 1989)":""}{safety?" · C-SSRS (Posner 2011)":""}</p>
        </section>

        <section style={{background:C.roseLight,borderRadius:10,padding:"10px 14px",marginTop:14,border:`1px solid ${C.rose}33`}}>
          <p style={{fontSize:11,lineHeight:1.6,color:C.textMid}}><strong>Disclaimer:</strong> This report is generated by ManaScreen, a wellness screening tool. It uses clinically validated instruments but is not a diagnostic report. All findings require clinical correlation by a qualified mental health professional.</p>
        </section>

        <p style={{fontSize:10,color:C.textMuted,textAlign:"center",marginTop:16,fontStyle:"italic"}}>ManaScreen · Built in India · manascreen.vercel.app</p>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .pdf-report, .pdf-report * { visibility: visible; }
          .pdf-report { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 20px !important; }
        }
      `}</style>
    </div>
  );
}

/* ─── FAQ Screen ─────────────────────────────────────────────────── */
function FAQScreen({phq9,gad7,onBack}){
  const [open,setOpen]=useState(null);
  const faqs=[
    {q:"What do my scores mean?",icon:"📊",a:()=>{const dl=phq9<=4?"minimal":phq9<=9?"mild":phq9<=14?"moderate":phq9<=19?"moderately severe":"severe";const al=gad7<=4?"minimal":gad7<=9?"mild":gad7<=14?"moderate":"severe";return `Your PHQ-9 (${phq9}/27) suggests ${dl} depression. Your GAD-7 (${gad7}/21) suggests ${al} anxiety. These reflect the last 2 weeks only — not a permanent state.`;}},
    {q:"Is this a diagnosis?",icon:"🩺",a:()=>`No — ManaScreen is a validated screening tool, not a clinical diagnosis. Only a qualified psychiatrist or psychologist can diagnose after a full clinical interview.`},
    {q:"Should I see a psychiatrist?",icon:"🤝",a:()=>{if(phq9>=15||gad7>=15)return `Yes — with your scores, we strongly encourage seeing a psychiatrist soon. Your symptoms are significant and treatable.`;if(phq9>=10||gad7>=10)return `Yes — speaking to a mental health professional would be very beneficial. Start with your GP if you're unsure.`;return `Your scores suggest mild symptoms. Monitor and seek help if things persist beyond 2–3 weeks.`;}},
    {q:"How do I tell my family?",icon:"👨‍👩‍👧",a:()=>`Choose a calm moment. Start small: "I've been feeling really low lately." Show them this app if words feel hard. Ask for one thing: "I just need you to listen."`},
    {q:"What can I do to feel better today?",icon:"🌱",a:()=>`Try the Box Breathing exercise. Text one trusted person. Drink water and eat something. Step outside for 10 minutes. Be kind to yourself — you took this assessment, that took courage.`},
    {q:"Will I need medication?",icon:"💊",a:()=>`Not necessarily. For mild symptoms, therapy and lifestyle changes are usually first-line. For moderate–severe, medication + therapy tends to work best. Your doctor will guide you.`},
    {q:"Free mental health support in India",icon:"📞",a:()=>`iCall: 9152987821 · Vandrevala (24/7): 1860-2662-345 · NIMHANS: 080-46110007 · Government hospital psychiatry OPDs are free/low cost under Ayushman Bharat.`},
    {q:"Can depression and anxiety be cured?",icon:"✨",a:()=>`The vast majority of people recover significantly with treatment. Think of it as "managed well" — many people reach a point where symptoms are minimal and they live full lives.`},
  ];
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:10}}>💬</div>
          <Pill color={C.sky}>Common Questions</Pill>
          <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>Questions & Answers</h2>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {faqs.map((faq,i)=>{
          const isOpen=open===i;
          return(
            <Fade key={i} delay={i*50}>
              <div style={{borderRadius:18,border:`1.5px solid ${isOpen?C.sky:C.border}`,background:isOpen?C.skyLight:C.card,transition:"all 0.25s",overflow:"hidden"}}>
                <button onClick={()=>setOpen(isOpen?null:i)} style={{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"16px 18px",background:"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:FB}}>
                  <span style={{fontSize:20}}>{faq.icon}</span>
                  <span style={{color:C.text,fontWeight:700,fontSize:14,flex:1}}>{faq.q}</span>
                  <span style={{color:C.textMuted,fontSize:18,transform:isOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.25s"}}>›</span>
                </button>
                {isOpen&&<div style={{padding:"0 18px 18px 52px"}}><p style={{color:C.textMid,fontSize:13,lineHeight:1.75}}>{faq.a()}</p></div>}
              </div>
            </Fade>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Learn Screen ───────────────────────────────────────────────── */
function LearnScreen({onBack}){
  const topics=[
    {id:"dep",icon:"🌧️",title:"What is Depression?",color:C.sky,body:`Depression is far more than sadness — it's a real medical condition. You might notice:\n• Heavy, empty feeling that won't lift\n• Loss of interest in things you loved\n• Exhaustion even after sleep\n• Feeling worthless\n\nIn India, depression often shows up physically — headaches, body pain, fatigue.\n\nDepression is NOT a character flaw. It is one of the most treatable medical conditions.`},
    {id:"anx",icon:"⚡",title:"What is Anxiety?",color:C.amber,body:`Some anxiety is natural. But constant, overwhelming worry may be an anxiety disorder.\n\n• Racing thoughts\n• Physical symptoms (racing heart, sweating)\n• Avoidance\n• Trouble sleeping\n\nIndian triggers: academic pressure, career stress, family expectations, financial worry.\n\nVery manageable with therapy, medication, and lifestyle changes.`},
    {id:"bipolar",icon:"🌓",title:"What is Bipolar?",color:C.lavender,body:`Bipolar disorder involves episodes of very low mood alternating with very high or irritable mood.\n\nSigns of high mood:\n• Unusually energised\n• Needing little sleep\n• Racing thoughts\n• Risk-taking\n\nOften missed or confused with depression. Very treatable with mood stabilisers + therapy.`},
    {id:"ptsd",icon:"🌪️",title:"What is PTSD?",color:C.rose,body:`PTSD can develop after experiencing or witnessing a traumatic event.\n\n• Flashbacks, intrusive memories\n• Nightmares\n• Avoiding reminders\n• Feeling constantly on edge\n• Emotional numbness\n\nVery treatable with trauma-focused therapy like EMDR. In India, PTSD from accidents, violence, loss is common and underdiagnosed.`},
    {id:"help",icon:"🤝",title:"When to Seek Help",color:C.sage,body:`Consider help if symptoms have lasted 2+ weeks, daily life is affected, you're using substances to cope, or having thoughts of self-harm.\n\nPsychiatrist = diagnosis + medication. Psychologist = therapy. GP = great first step.\n\nCrisis lines:\niCall: 9152987821\nVandrevala (24/7): 1860-2662-345`},
    {id:"care",icon:"🌱",title:"Gentle Self-Care",color:C.peach,body:`Small daily practices help:\n\n• Consistent sleep/wake\n• 15-min daily walk\n• Regular meals\n• 3 gratitudes each morning\n• 5-min pranayama\n• Limit social media\n• Be kind to yourself\n• Tell one trusted person how you feel\n\nHealing is not linear. Hard days are okay.`},
    {id:"fam",icon:"👨‍👩‍👧",title:"For Family & Caregivers",color:"#9b72cf",body:`What helps:\n• Listen without judgment\n• "I'm here for you"\n• Help access professional care\n• Check in regularly\n• Be patient\n\nWhat doesn't:\n• "Think positive"\n• "Pull yourself together"\n• Sharing without permission\n\nCaregiver burnout is real — look after yourself too.`},
  ];
  const [topic,setTopic]=useState(null);
  if(topic)return(
    <div>
      <BackBar onBack={()=>setTopic(null)}/>
      <Fade>
        <div style={{fontSize:44,marginBottom:12}}>{topic.icon}</div>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:18}}>{topic.title}</h2>
        {topic.body.split("\n").map((line,i)=>{const isHead=line.length>0&&line.length<38&&!line.startsWith("•")&&!line.match(/^[📞]/);return line===""?<div key={i} style={{height:8}}/>:<p key={i} style={{color:isHead?topic.color:C.textMid,fontWeight:isHead?800:400,fontSize:14,lineHeight:1.8,marginBottom:2}}>{line}</p>;})}
      </Fade>
    </div>
  );
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,marginBottom:6}}>Learn & Understand</h2>
        <p style={{color:C.textMid,fontSize:14,marginBottom:20}}>Guides to mental health.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {topics.map((t,i)=>(
          <Fade key={t.id} delay={i*50}>
            <button onClick={()=>setTopic(t)} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",background:C.card,border:`1.5px solid ${C.border}`,borderRadius:18,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB}}>
              <div style={{width:44,height:44,borderRadius:13,background:t.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{t.icon}</div>
              <span style={{color:C.text,fontWeight:800,fontSize:14,flex:1}}>{t.title}</span>
              <span style={{color:C.textMuted,fontSize:20}}>›</span>
            </button>
          </Fade>
        ))}
      </div>
    </div>
  );
}

/* ─── Help Now button ────────────────────────────────────────────── */
function HelpNowButton({active,onToggle}){
  return(
    <>
      <button onClick={onToggle} aria-label="Need help now" style={{position:"fixed",bottom:18,right:18,zIndex:100,width:56,height:56,borderRadius:"50%",background:active?C.rose:C.white,color:active?C.white:C.rose,boxShadow:active?"0 6px 24px rgba(201,96,106,0.5)":"0 4px 16px rgba(0,0,0,0.12)",cursor:"pointer",fontSize:22,fontFamily:FB,fontWeight:800,border:`2px solid ${C.rose}`,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.25s ease"}}>
        {active?"✕":"💙"}
      </button>
      {active&&<div onClick={onToggle} style={{position:"fixed",inset:0,background:"rgba(45,36,32,0.55)",zIndex:98,backdropFilter:"blur(4px)"}}/>}
      {active&&(
        <div style={{position:"fixed",bottom:84,right:18,left:18,maxWidth:400,margin:"0 auto",zIndex:99,background:C.white,borderRadius:22,border:`2px solid ${C.rose}`,padding:"20px",boxShadow:"0 20px 50px rgba(0,0,0,0.25)"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{fontSize:26}}>💙</div>
            <div>
              <div style={{color:C.rose,fontWeight:800,fontSize:16,fontFamily:FD}}>You are not alone</div>
              <div style={{color:C.textSoft,fontSize:11}}>Free, confidential helplines</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[
              {name:"iCall",num:"9152987821",note:"Mon–Sat, 8am–10pm",color:C.rose},
              {name:"Vandrevala",num:"1860-2662-345",note:"24/7 · All India",color:C.peach},
              {name:"NIMHANS",num:"08046110007",note:"24/7 national helpline",color:C.sky},
              {name:"iCall Email",num:"icall@tiss.edu",note:"Email option",color:C.sage,isEmail:true},
            ].map(h=>(
              <a key={h.name} href={h.isEmail?`mailto:${h.num}`:`tel:${h.num.replace(/-/g,"")}`} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:h.color+"13",border:`1.5px solid ${h.color}44`,borderRadius:12,textDecoration:"none"}}>
                <div style={{fontSize:18}}>{h.isEmail?"✉️":"📞"}</div>
                <div style={{flex:1}}>
                  <div style={{color:C.text,fontWeight:800,fontSize:13}}>{h.name}</div>
                  <div style={{color:h.color,fontSize:12,fontWeight:700}}>{h.num}</div>
                </div>
              </a>
            ))}
          </div>
          <div style={{marginTop:12,padding:"8px 12px",background:C.amberLight,borderRadius:10}}>
            <p style={{color:C.textMid,fontSize:11,lineHeight:1.55}}>🏥 <strong>Emergency:</strong> Call <a href="tel:112" style={{color:C.rose,fontWeight:800}}>112</a> or go to nearest hospital.</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── Quick Check (PHQ-2 + GAD-2) — custom attractive flow ──────── */
const PHQ2 = [PHQ9[0], PHQ9[1]]; // first 2 PHQ-9 items
const GAD2 = [GAD7[0], GAD7[1]]; // first 2 GAD-7 items
const QC_QUESTIONS = [
  {...PHQ9[0], tint:C.sky,      tintLight:C.skyLight,      group:"mood"},
  {...PHQ9[1], tint:C.lavender, tintLight:C.lavenderLight, group:"mood"},
  {...GAD7[0], tint:C.sage,     tintLight:C.sageLight,     group:"worry"},
  {...GAD7[1], tint:C.teal,     tintLight:C.tealLight,     group:"worry"},
];
const QC_AFFIRMATIONS = [
  "Thank you for being honest 🌿",
  "That took courage 💛",
  "You're doing beautifully 🌸",
  "One more — you're almost there ✨",
];

function QuickCheckScreen({onComplete,onBack,onGoFull}){
  const [phase,setPhase]=useState("intro");
  const [current,setCurrent]=useState(0);
  const [answers,setAnswers]=useState([]);
  const [selected,setSelected]=useState(null);
  const [showAffirm,setShowAffirm]=useState(false);
  const [visible,setVisible]=useState(true);

  /* ── Intro ──────────────────────────────────────────────────── */
  if(phase==="intro"){
    return(
      <div>
        <BackBar onBack={onBack}/>
        <Fade>
          <div style={{textAlign:"center",marginBottom:26}}>
            <div style={{position:"relative",width:120,height:120,margin:"10px auto 18px"}}>
              {/* pulsing rings */}
              <div style={{position:"absolute",inset:0,borderRadius:"50%",background:C.teal+"22",animation:"qcPulse 2.4s ease-in-out infinite"}}/>
              <div style={{position:"absolute",inset:14,borderRadius:"50%",background:C.teal+"33",animation:"qcPulse 2.4s ease-in-out infinite 0.6s"}}/>
              <div style={{position:"absolute",inset:28,borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,boxShadow:"0 6px 20px rgba(74,171,176,0.35)"}}>⚡</div>
            </div>
            <Pill color={C.teal}>90 seconds · 4 questions</Pill>
            <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"14px 0 10px"}}>A gentle check-in</h2>
            <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,maxWidth:320,margin:"0 auto"}}>Four quick questions. No judgement. No right answers. Just a moment to see how you're really doing.</p>
          </div>
        </Fade>
        <Fade delay={200}>
          <Card style={{marginBottom:16,background:`linear-gradient(135deg,${C.tealLight} 0%,#f0fafa 100%)`,border:`1.5px solid ${C.teal}44`}}>
            <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:10}}>
              <span style={{fontSize:22}}>🌿</span>
              <div>
                <p style={{color:C.teal,fontWeight:800,fontSize:13,marginBottom:4}}>What happens next?</p>
                <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>You'll see one question at a time. Tap the answer that feels closest to you. At the end, you'll get gentle insight — and the option to go deeper if you'd like.</p>
              </div>
            </div>
          </Card>
        </Fade>
        <Fade delay={350}>
          <WarmButton onClick={()=>setPhase("questions")} variant="teal">Let's begin 🌱</WarmButton>
          <button onClick={onGoFull} style={{display:"block",margin:"14px auto 0",background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:13,fontFamily:FB,textDecoration:"underline"}}>Or take the full 15-min assessment</button>
        </Fade>
        <style>{`
          @keyframes qcPulse{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.08);opacity:1}}
        `}</style>
      </div>
    );
  }

  /* ── Questions ──────────────────────────────────────────────── */
  const q=QC_QUESTIONS[current];
  const progress=((current)/QC_QUESTIONS.length)*100;
  const groupColor=q.tint;
  const groupLabel=q.group==="mood"?"Mood":"Worry";

  const handleAnswer=(val)=>{
    if(selected!==null) return;
    tapHaptic("light");
    setSelected(val);
    setShowAffirm(true);
    setTimeout(()=>{
      setShowAffirm(false);
      setVisible(false);
      setTimeout(()=>{
        const na=[...answers,val];
        if(current+1<QC_QUESTIONS.length){
          setAnswers(na);
          setCurrent(c=>c+1);
          setSelected(null);
          setVisible(true);
        } else {
          // complete: compute phq2 and gad2
          playChime("complete");
          tapHaptic("medium");
          const phq2=na[0]+na[1];
          const gad2=na[2]+na[3];
          onComplete({phq2,gad2,phq2Answers:[na[0],na[1]],gad2Answers:[na[2],na[3]]});
        }
      },200);
    },550);
  };

  const handleBackInside=()=>{
    if(current>0){
      setAnswers(answers.slice(0,-1));
      setCurrent(c=>c-1);
      setSelected(null);
      setVisible(true);
    } else {
      setPhase("intro");
    }
  };

  return(
    <div>
      <BackBar onBack={handleBackInside} label={current>0?"Previous question":"Back"}/>

      {/* Progress — 4 dots that fill up */}
      <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:22}}>
        {QC_QUESTIONS.map((qq,i)=>(
          <div key={i} style={{
            width:i===current?28:10,
            height:10,
            borderRadius:6,
            background:i<current?qq.tint:i===current?qq.tint:C.border,
            transition:"all 0.4s ease",
            boxShadow:i===current?`0 0 0 4px ${qq.tint}22`:"none",
          }}/>
        ))}
      </div>

      <div style={{textAlign:"center",marginBottom:14}}>
        <Pill color={groupColor}>{groupLabel} · Question {current+1} of {QC_QUESTIONS.length}</Pill>
      </div>

      {/* Question card with fade */}
      <div style={{opacity:visible?1:0,transform:visible?"translateY(0) scale(1)":"translateY(-8px) scale(0.98)",transition:"opacity 0.4s ease,transform 0.4s ease"}}>
        <Card style={{marginBottom:20,background:`linear-gradient(135deg,${q.tintLight} 0%,#ffffff 100%)`,border:`1.5px solid ${groupColor}33`,textAlign:"center",padding:"28px 22px"}}>
          <div style={{fontSize:52,marginBottom:14,animation:"qcFloat 3s ease-in-out infinite"}}>{q.emoji}</div>
          <p style={{color:C.textSoft,fontSize:12,marginBottom:10,letterSpacing:0.3}}>Over the last <strong>2 weeks</strong>, how often…</p>
          <p style={{fontFamily:FD,color:C.text,fontSize:18,lineHeight:1.55,fontWeight:600}}>{q.q}</p>
        </Card>
      </div>

      {/* Affirmation */}
      <div style={{textAlign:"center",height:26,marginBottom:10,opacity:showAffirm?1:0,transform:showAffirm?"translateY(0)":"translateY(-4px)",transition:"all 0.35s ease"}}>
        <span style={{color:groupColor,fontWeight:800,fontSize:14}}>{QC_AFFIRMATIONS[current]}</span>
      </div>

      {/* Answer buttons */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {FREQ4.map(ch=>{
          const isSelected=selected===ch.value;
          return(
            <button key={ch.value} onClick={()=>handleAnswer(ch.value)}
              style={{
                display:"flex",alignItems:"center",gap:14,
                padding:"15px 18px",borderRadius:16,
                border:`2px solid ${isSelected?groupColor:C.border}`,
                background:isSelected?groupColor+"15":C.card,
                cursor:selected!==null?"default":"pointer",
                textAlign:"left",width:"100%",fontFamily:FB,
                transition:"all 0.2s ease",
                opacity:selected!==null&&!isSelected?0.4:1,
                transform:isSelected?"scale(1.02)":"scale(1)",
                boxShadow:isSelected?`0 4px 16px ${groupColor}33`:"0 2px 8px rgba(0,0,0,0.03)",
              }}>
              <div style={{
                width:36,height:36,borderRadius:11,
                background:isSelected?groupColor:groupColor+"1a",
                color:isSelected?C.white:groupColor,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:800,fontSize:14,flexShrink:0,
                transition:"all 0.2s ease",
              }}>{isSelected?"✓":ch.value}</div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontWeight:700,fontSize:15}}>{ch.label}</div>
                <div style={{color:C.textSoft,fontSize:12,marginTop:1}}>{ch.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      <style>{`
        @keyframes qcFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
      `}</style>
    </div>
  );
}

function QuickCheckResult({phq2,gad2,onGoFull,onDone,onHelp}){
  const depPositive=phq2>=3;
  const anxPositive=gad2>=3;
  const anyPositive=depPositive||anxPositive;
  const [revealPhase,setRevealPhase]=useState(0); // staged reveal

  useEffect(()=>{
    const t1=setTimeout(()=>setRevealPhase(1),400);
    const t2=setTimeout(()=>setRevealPhase(2),1000);
    const t3=setTimeout(()=>setRevealPhase(3),1600);
    return()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
  },[]);

  // Warm message
  const warmTitle=anyPositive
    ? (depPositive&&anxPositive?"We hear you":depPositive?"Your heart is carrying something":"Your mind has been busy")
    : "You're doing okay";
  const warmMessage=anyPositive
    ? "Your answers suggest there's something worth exploring together. You've already done the hardest part — noticing."
    : "Your brief check doesn't flag anything significant right now. But trust yourself — if something feels off, don't ignore it.";

  const resultColor=anyPositive?C.peach:C.sage;

  return(
    <div>
      {/* Hero reveal */}
      <div style={{textAlign:"center",paddingTop:20,marginBottom:24}}>
        <div style={{
          fontSize:72,marginBottom:14,
          opacity:revealPhase>=1?1:0,
          transform:revealPhase>=1?"scale(1)":"scale(0.5)",
          transition:"all 0.7s cubic-bezier(0.34,1.56,0.64,1)",
        }}>{anyPositive?"🫂":"🌸"}</div>

        <div style={{
          opacity:revealPhase>=1?1:0,
          transform:revealPhase>=1?"translateY(0)":"translateY(10px)",
          transition:"all 0.5s ease 0.2s",
        }}>
          <Pill color={resultColor}>Your check-in</Pill>
          <h2 style={{fontFamily:FD,fontSize:28,color:C.text,margin:"14px 0 10px",lineHeight:1.3}}>{warmTitle}</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,maxWidth:340,margin:"0 auto"}}>{warmMessage}</p>
        </div>
      </div>

      {/* Visual score cards with gentle reveal */}
      <div style={{
        display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18,
        opacity:revealPhase>=2?1:0,
        transform:revealPhase>=2?"translateY(0)":"translateY(14px)",
        transition:"all 0.6s ease",
      }}>
        {[
          {label:"Mood",score:phq2,positive:depPositive,icon:"💭",color:depPositive?C.peach:C.sage},
          {label:"Worry",score:gad2,positive:anxPositive,icon:"🌿",color:anxPositive?C.peach:C.sage},
        ].map(s=>(
          <div key={s.label} style={{
            background:`linear-gradient(135deg,${s.color}12 0%,${s.color}05 100%)`,
            border:`1.5px solid ${s.color}44`,
            borderRadius:18,padding:"18px 14px",textAlign:"center",
          }}>
            <div style={{fontSize:30,marginBottom:4}}>{s.icon}</div>
            <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:4}}>{s.label}</div>
            <div style={{color:s.color,fontWeight:800,fontSize:22,fontFamily:FD}}>{s.score}<span style={{fontSize:12,color:C.textMuted,fontFamily:FB}}>/6</span></div>
            <div style={{fontSize:11,color:s.color,fontWeight:700,marginTop:4}}>{s.positive?"Worth exploring":"Looking okay"}</div>
          </div>
        ))}
      </div>

      {/* Insight card */}
      <div style={{
        opacity:revealPhase>=3?1:0,
        transform:revealPhase>=3?"translateY(0)":"translateY(14px)",
        transition:"all 0.6s ease",
      }}>
        {anyPositive ? (
          <>
            <Card style={{marginBottom:14,background:`linear-gradient(135deg,${C.peachLight} 0%,#fff4ee 100%)`,border:`1.5px solid ${C.peach}44`}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:22,flexShrink:0}}>🌱</span>
                <div>
                  <p style={{color:C.peach,fontWeight:800,fontSize:14,marginBottom:8}}>Here's what we noticed</p>
                  <p style={{color:C.textMid,fontSize:13,lineHeight:1.75,marginBottom:10}}>This brief check is designed to pick up on early signs. Your answers suggest it's worth taking a closer look — not because something is wrong, but because <strong>understanding helps</strong>.</p>
                  <p style={{color:C.textMid,fontSize:13,lineHeight:1.75}}>The full 15-minute assessment gives you a clearer picture of what you're experiencing, possible reasons, and a shareable report for your doctor.</p>
                </div>
              </div>
            </Card>

            <button onClick={onGoFull} style={{
              width:"100%",padding:"18px 20px",borderRadius:20,
              border:`2px solid ${C.peach}`,
              background:`linear-gradient(135deg,${C.peach} 0%,#d9704a 100%)`,
              color:C.white,cursor:"pointer",textAlign:"left",fontFamily:FB,
              display:"flex",alignItems:"center",gap:14,marginBottom:10,
              boxShadow:`0 6px 20px ${C.peach}55`,
            }}>
              <div style={{width:48,height:48,borderRadius:14,background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🌸</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:16,marginBottom:2}}>Take the full assessment</div>
                <div style={{fontSize:12,opacity:0.9}}>10–15 minutes · clinical report included</div>
              </div>
              <span style={{fontSize:22}}>›</span>
            </button>

            <WarmButton onClick={onDone} variant="secondary">Not today — maybe later</WarmButton>
          </>
        ) : (
          <>
            <Card style={{marginBottom:14,background:`linear-gradient(135deg,${C.sageLight} 0%,#f0faf4 100%)`,border:`1.5px solid ${C.sage}44`}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{fontSize:22,flexShrink:0}}>🌿</span>
                <div>
                  <p style={{color:C.sage,fontWeight:800,fontSize:14,marginBottom:8}}>A gentle reminder</p>
                  <p style={{color:C.textMid,fontSize:13,lineHeight:1.75}}>A brief screen is never the full story. If things feel heavy even when scores look fine, <strong>trust yourself</strong>. The full assessment can give you a fuller picture anytime.</p>
                </div>
              </div>
            </Card>
            <WarmButton onClick={onGoFull} variant="secondary">Take the full assessment anyway</WarmButton>
            <div style={{height:10}}/>
            <WarmButton onClick={onDone} variant="ghost">Finish here</WarmButton>
          </>
        )}

        <button onClick={onHelp} style={{
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          width:"100%",padding:"12px",marginTop:14,
          background:"none",border:"none",
          color:C.rose,cursor:"pointer",fontSize:13,fontFamily:FB,fontWeight:700,
        }}>💙 I want to talk to someone now</button>
      </div>

      <div style={{
        background:C.amberLight,border:`1px solid ${C.amber}33`,borderRadius:12,padding:"10px 14px",marginTop:14,
        opacity:revealPhase>=3?1:0,transition:"opacity 0.6s ease 0.4s",
      }}>
        <p style={{color:C.textMid,fontSize:11,lineHeight:1.6}}>The PHQ-2/GAD-2 are validated screening tools. A "looking okay" result means the brief screen didn't flag anything — not that concerns don't exist. Always trust how you feel.</p>
      </div>
    </div>
  );
}

/* ─── Medications screen ────────────────────────────────────────── */
function MedicationsScreen({onComplete,onBack,initial}){
  const [selected,setSelected]=useState(initial?.selected||[]);
  const [other,setOther]=useState(initial?.other||"");
  const toggle=(key)=>setSelected(s=>s.includes(key)?s.filter(x=>x!==key):[...s,key]);

  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.teal}>Medication Review</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 8px"}}>Any of these medications?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:14}}>Some medications can affect mood or be mistaken for mental health symptoms. Please select any you're taking.</p>
        <div style={{background:C.tealLight,border:`1.5px solid ${C.teal}44`,borderRadius:14,padding:"12px 16px",marginBottom:20}}>
          <p style={{color:C.teal,fontSize:13,fontWeight:700,lineHeight:1.6}}>💊 This is important for your doctor to know — please don't stop any medication without talking to your doctor first.</p>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
        {MOOD_AFFECTING_MEDS.map((m,i)=>(
          <Fade key={m.key} delay={i*40}>
            <button onClick={()=>toggle(m.key)} style={{display:"flex",gap:12,padding:"13px 16px",borderRadius:14,border:`2px solid ${selected.includes(m.key)?C.teal:C.border}`,background:selected.includes(m.key)?C.tealLight:C.card,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,alignItems:"center"}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${selected.includes(m.key)?C.teal:C.border}`,background:selected.includes(m.key)?C.teal:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {selected.includes(m.key)&&<span style={{color:C.white,fontSize:12,fontWeight:800}}>✓</span>}
              </div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontWeight:700,fontSize:13,lineHeight:1.4}}>{m.label}</div>
              </div>
            </button>
          </Fade>
        ))}
      </div>
      {selected.includes("other")&&(
        <Fade>
          <input value={other} onChange={e=>setOther(e.target.value)} placeholder="Any other medications (optional, for your records)"
            style={{width:"100%",padding:"12px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.card,color:C.text,fontSize:13,fontFamily:FB,outline:"none",marginBottom:16}}/>
        </Fade>
      )}
      <button onClick={()=>{setSelected([]);setOther("");}} style={{display:"block",margin:"0 auto 16px",background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:12,fontFamily:FB,fontStyle:"italic",textDecoration:"underline"}}>None of these / clear selection</button>
      <WarmButton onClick={()=>onComplete({selected,other})} variant="teal">Continue →</WarmButton>
    </div>
  );
}

/* ─── Mood check-in (Feature 2) ─────────────────────────────────── */
function MoodCheckScreen({onDone,onBack}){
  const [selected,setSelected]=useState(null);
  const [note,setNote]=useState("");
  const [phase,setPhase]=useState("mood"); // mood | note | done
  const [saved,setSaved]=useState(false);

  const handleMoodPick=(mood)=>{
    tapHaptic("light");
    setSelected(mood);
    setTimeout(()=>setPhase("note"),420);
  };

  const saveMood=()=>{
    const log=storage.get(MOODLOG_KEY,[]);
    const entry={
      when:Date.now(),
      value:selected.value,
      label:selected.label,
      emoji:selected.emoji,
      note:note.trim()||null,
    };
    // Replace if same day, else append
    const today=new Date().toDateString();
    const filtered=log.filter(e=>new Date(e.when).toDateString()!==today);
    const updated=[...filtered,entry].slice(-60); // keep last 60 entries
    storage.set(MOODLOG_KEY,updated);
    playChime("soft");
    tapHaptic("medium");
    setSaved(true);
    setPhase("done");
  };

  if(phase==="mood")return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <div style={{textAlign:"center",marginTop:20,marginBottom:28}}>
          <Pill color={C.peach}>10 seconds</Pill>
          <h2 style={{fontFamily:FD,fontSize:28,color:C.text,margin:"14px 0 10px"}}>How are you feeling?</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.7}}>Right now, in this moment. No wrong answers.</p>
        </div>
      </Fade>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {MOODS.map((m,i)=>(
          <Fade key={m.value} delay={i*70}>
            <button onClick={()=>handleMoodPick(m)}
              style={{
                display:"flex",alignItems:"center",gap:16,
                padding:"18px 20px",
                borderRadius:20,
                border:`2px solid ${selected?.value===m.value?m.color:C.border}`,
                background:selected?.value===m.value?m.color+"18":C.card,
                cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,
                transition:"all 0.25s ease",
                transform:selected?.value===m.value?"scale(1.03)":"scale(1)",
                boxShadow:selected?.value===m.value?`0 6px 18px ${m.color}33`:"0 2px 8px rgba(0,0,0,0.04)",
              }}>
              <div style={{fontSize:36,filter:selected?.value===m.value?"none":"grayscale(0%)"}}>{m.emoji}</div>
              <div style={{flex:1}}>
                <div style={{color:C.text,fontWeight:800,fontSize:16}}>{m.label}</div>
              </div>
              {selected?.value===m.value&&<span style={{color:m.color,fontSize:24}}>✓</span>}
            </button>
          </Fade>
        ))}
      </div>
    </div>
  );

  if(phase==="note")return(
    <div>
      <BackBar onBack={()=>setPhase("mood")}/>
      <Fade>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:56,marginBottom:10}}>{selected.emoji}</div>
          <Pill color={selected.color}>Feeling {selected.label.toLowerCase()}</Pill>
          <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"14px 0 8px"}}>Want to say why? <span style={{color:C.textSoft,fontSize:14,fontWeight:400}}>(optional)</span></h2>
          <p style={{color:C.textMid,fontSize:14}}>A word or two. Private to your device.</p>
        </div>
      </Fade>
      <Fade delay={120}>
        <textarea value={note} onChange={e=>setNote(e.target.value)}
          placeholder="Work was stressful… / slept badly… / proud of myself…"
          rows={3}
          style={{
            width:"100%",padding:"14px 16px",
            borderRadius:16,
            border:`1.5px solid ${C.border}`,
            background:C.card,
            color:C.text,fontSize:15,fontFamily:FB,
            lineHeight:1.6,outline:"none",resize:"none",marginBottom:16,
          }}
          maxLength={160}/>
        <div style={{color:C.textMuted,fontSize:11,textAlign:"right",marginTop:-12,marginBottom:18}}>{note.length}/160</div>
      </Fade>
      <Fade delay={220}>
        <WarmButton onClick={saveMood} variant="sage">Save my check-in 🌿</WarmButton>
        <button onClick={saveMood} style={{display:"block",margin:"12px auto 0",background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:13,fontFamily:FB,textDecoration:"underline"}}>Skip note</button>
      </Fade>
    </div>
  );

  // done
  return(
    <div style={{textAlign:"center",paddingTop:40}}>
      <Fade>
        <div style={{fontSize:70,marginBottom:14,animation:"checkBloom 0.7s cubic-bezier(0.34,1.56,0.64,1)"}}>✨</div>
        <h2 style={{fontFamily:FD,fontSize:26,color:C.text,marginBottom:10}}>Logged</h2>
        <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28,maxWidth:300,margin:"0 auto 28px"}}>Noticing how you feel — even briefly — is itself an act of care.</p>
        <WarmButton onClick={onDone} variant="sage">Back home →</WarmButton>
        <style>{`@keyframes checkBloom{0%{transform:scale(0.3);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}}`}</style>
      </Fade>
    </div>
  );
}

/* ─── Mood mini-calendar (for dashboard) ─────────────────────────── */
function MoodCalendar({log,days=14}){
  // Build array of last N days
  const today=new Date();today.setHours(0,0,0,0);
  const cells=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date(today);d.setDate(d.getDate()-i);
    const entry=log.find(e=>new Date(e.when).toDateString()===d.toDateString());
    cells.push({date:d,entry});
  }
  if(!log.length)return(
    <div style={{padding:"16px",background:C.card,border:`1.5px dashed ${C.border}`,borderRadius:16,textAlign:"center"}}>
      <p style={{color:C.textSoft,fontSize:13,lineHeight:1.6}}>Your mood calendar will appear here once you start checking in.</p>
    </div>
  );

  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:`repeat(${days},1fr)`,gap:3,marginBottom:10}}>
        {cells.map((c,i)=>{
          const mood=c.entry?MOODS.find(m=>m.value===c.entry.value):null;
          const today=i===days-1;
          return(
            <div key={i} style={{
              aspectRatio:"1",
              borderRadius:6,
              background:mood?mood.color+"40":C.border+"55",
              border:today?`2px solid ${C.peach}`:"none",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:10,
              color:mood?mood.color:C.textMuted,
              fontWeight:800,
            }} title={mood?`${c.date.toLocaleDateString()}: ${mood.label}`:c.date.toLocaleDateString()}>
              {mood?mood.emoji:""}
            </div>
          );
        })}
      </div>
      <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textMuted,fontWeight:700}}>
        <span>{days} days ago</span><span>Today</span>
      </div>
    </div>
  );
}

/* ─── Returning-user dashboard (Feature 1) ──────────────────────── */
function ReturningDashboard({history,moodLog,onMoodCheck,onQuick,onFull,onExercises,onJournal,onPrivacy,onRefs,onResultsView}){
  const hour=new Date().getHours();
  const greeting=hour<5?"Hello, night owl":hour<12?"Good morning":hour<17?"Good afternoon":hour<21?"Good evening":"Hello, night owl";
  const lastAssessment=history?.[history.length-1];
  const lastMood=moodLog?.[moodLog.length-1];
  const daysSinceLastAssessment=lastAssessment?Math.floor((Date.now()-lastAssessment.when)/(1000*60*60*24)):null;
  const moodToday=moodLog?.find(e=>new Date(e.when).toDateString()===new Date().toDateString());

  return(
    <div style={{paddingTop:12}}>
      <Fade>
        <div style={{textAlign:"center",marginBottom:18}}>
          <p style={{color:C.textSoft,fontSize:13,fontWeight:700,marginBottom:4}}>{greeting} 🌿</p>
          <h1 style={{fontFamily:FD,fontSize:30,fontWeight:700,color:C.text,marginBottom:6,letterSpacing:-0.3}}>Welcome back</h1>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.6}}>{moodToday?`Today you're feeling ${moodToday.label.toLowerCase()} ${moodToday.emoji}`:"How are you today?"}</p>
        </div>
      </Fade>

      {/* Daily mood card — hero if not logged today */}
      {!moodToday ? (
        <Fade delay={150}>
          <button onClick={onMoodCheck} style={{
            width:"100%",padding:"20px",borderRadius:22,
            border:"none",
            background:`linear-gradient(135deg,${C.peach} 0%,#d9704a 100%)`,
            color:C.white,cursor:"pointer",textAlign:"left",fontFamily:FB,
            display:"flex",alignItems:"center",gap:14,marginBottom:14,
            boxShadow:`0 8px 24px ${C.peach}55`,
            position:"relative",overflow:"hidden",
          }}>
            <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,backdropFilter:"blur(4px)"}}>💭</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:16,marginBottom:2}}>Check in with yourself</div>
              <div style={{fontSize:12,opacity:0.92}}>Just 10 seconds · Mood + optional note</div>
            </div>
            <span style={{fontSize:22}}>›</span>
          </button>
        </Fade>
      ) : (
        <Fade delay={150}>
          <Card style={{marginBottom:14,background:`linear-gradient(135deg,${C.sageLight} 0%,#f0faf4 100%)`,border:`1.5px solid ${C.sage}44`}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:32}}>{moodToday.emoji}</div>
              <div style={{flex:1}}>
                <div style={{color:C.sage,fontWeight:800,fontSize:13,marginBottom:2}}>✓ Checked in today</div>
                <div style={{color:C.textMid,fontSize:13,lineHeight:1.5}}>
                  {moodToday.note?<em>"{moodToday.note}"</em>:`Feeling ${moodToday.label.toLowerCase()}`}
                </div>
              </div>
            </div>
          </Card>
        </Fade>
      )}

      {/* Mood calendar */}
      {moodLog?.length>0 && (
        <Fade delay={220}>
          <Card style={{marginBottom:14,padding:"16px 18px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2}}>Your last 14 days</div>
              <div style={{color:C.peach,fontSize:11,fontWeight:700}}>{moodLog.length} {moodLog.length===1?"check-in":"check-ins"}</div>
            </div>
            <MoodCalendar log={moodLog} days={14}/>
          </Card>
        </Fade>
      )}

      {/* Assessment history reminder */}
      {lastAssessment && (
        <Fade delay={280}>
          <Card style={{marginBottom:14,padding:"16px 18px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:40,height:40,borderRadius:12,background:C.skyLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📊</div>
              <div style={{flex:1}}>
                <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1}}>Last assessment</div>
                <div style={{color:C.text,fontSize:14,fontWeight:700}}>{daysSinceLastAssessment===0?"Today":daysSinceLastAssessment===1?"Yesterday":`${daysSinceLastAssessment} days ago`}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{color:C.sky,fontSize:11,fontWeight:700}}>PHQ-9 {lastAssessment.phq9}</div>
                <div style={{color:C.sage,fontSize:11,fontWeight:700}}>GAD-7 {lastAssessment.gad7}</div>
              </div>
            </div>
            {daysSinceLastAssessment>=14 && (
              <button onClick={onFull} style={{
                width:"100%",padding:"10px",
                background:C.peachLight,border:`1.5px solid ${C.peach}44`,
                borderRadius:12,color:C.peach,fontSize:13,fontWeight:800,
                cursor:"pointer",fontFamily:FB,
              }}>
                🌱 It's been {daysSinceLastAssessment} days — time for another check
              </button>
            )}
          </Card>
        </Fade>
      )}

      {/* Quick actions */}
      <Fade delay={350}>
        <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:10,marginTop:18}}>What would you like to do?</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <button onClick={onQuick} style={{
            padding:"18px 14px",borderRadius:18,
            border:`2px solid ${C.teal}55`,background:C.tealLight,
            cursor:"pointer",textAlign:"center",fontFamily:FB,
          }}>
            <div style={{fontSize:28,marginBottom:6}}>⚡</div>
            <div style={{color:C.teal,fontWeight:800,fontSize:13}}>Quick Check</div>
            <div style={{color:C.textSoft,fontSize:10,marginTop:2}}>90 seconds</div>
          </button>
          <button onClick={onExercises} style={{
            padding:"18px 14px",borderRadius:18,
            border:`2px solid ${C.sage}55`,background:C.sageLight,
            cursor:"pointer",textAlign:"center",fontFamily:FB,
          }}>
            <div style={{fontSize:28,marginBottom:6}}>🌿</div>
            <div style={{color:C.sage,fontWeight:800,fontSize:13}}>Calm down</div>
            <div style={{color:C.textSoft,fontSize:10,marginTop:2}}>Breathing & more</div>
          </button>
          <button onClick={onJournal} style={{
            padding:"18px 14px",borderRadius:18,
            border:`2px solid ${C.lavender}55`,background:C.lavenderLight,
            cursor:"pointer",textAlign:"center",fontFamily:FB,
          }}>
            <div style={{fontSize:28,marginBottom:6}}>📖</div>
            <div style={{color:C.lavender,fontWeight:800,fontSize:13}}>Journal</div>
            <div style={{color:C.textSoft,fontSize:10,marginTop:2}}>Gentle prompts</div>
          </button>
          <button onClick={onMoodCheck} style={{
            padding:"18px 14px",borderRadius:18,
            border:`2px solid ${C.peach}55`,background:C.peachLight,
            cursor:"pointer",textAlign:"center",fontFamily:FB,
          }}>
            <div style={{fontSize:28,marginBottom:6}}>💭</div>
            <div style={{color:C.peach,fontWeight:800,fontSize:13}}>Mood log</div>
            <div style={{color:C.textSoft,fontSize:10,marginTop:2}}>10-second check-in</div>
          </button>
        </div>
        <button onClick={onFull} style={{
          width:"100%",padding:"14px 18px",borderRadius:16,
          border:`1.5px solid ${C.border}`,background:C.card,
          cursor:"pointer",textAlign:"left",fontFamily:FB,
          display:"flex",alignItems:"center",gap:12,
        }}>
          <div style={{width:40,height:40,borderRadius:12,background:C.peachLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📋</div>
          <div style={{flex:1}}>
            <div style={{color:C.text,fontWeight:700,fontSize:14}}>Full assessment</div>
            <div style={{color:C.textSoft,fontSize:11,marginTop:1}}>10–15 min · detailed report</div>
          </div>
          <span style={{color:C.textMuted,fontSize:20}}>›</span>
        </button>
        {lastAssessment && (
          <button onClick={onResultsView} style={{
            width:"100%",marginTop:8,padding:"12px",
            background:"none",border:"none",
            color:C.sky,fontSize:13,fontWeight:700,fontFamily:FB,cursor:"pointer",
          }}>
            View your last results →
          </button>
        )}
      </Fade>

      {/* Footer */}
      <Fade delay={450}>
        <div style={{background:C.roseLight,border:`1.5px solid ${C.rose}44`,borderRadius:14,padding:"11px 14px",marginTop:20,marginBottom:12,textAlign:"left"}}>
          <div style={{color:C.rose,fontWeight:800,fontSize:12,marginBottom:2}}>💙 Need to talk to someone?</div>
          <div style={{color:C.textMid,fontSize:11,lineHeight:1.65}}>Tap the 💙 button anytime · iCall <strong>9152987821</strong></div>
        </div>
        <div style={{display:"flex",gap:14,justifyContent:"center",fontSize:11}}>
          <button onClick={onPrivacy} style={{background:"none",border:"none",color:C.textSoft,textDecoration:"underline",cursor:"pointer",fontFamily:FB,fontSize:11}}>🔒 Privacy</button>
          <button onClick={onRefs} style={{background:"none",border:"none",color:C.textSoft,textDecoration:"underline",cursor:"pointer",fontFamily:FB,fontSize:11}}>📚 References</button>
        </div>
      </Fade>
    </div>
  );
}

/* ─── Adolescent pathway (Feature 12) ────────────────────────────── */
function TeenIntroScreen({onContinue,onBack}){
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <div style={{textAlign:"center",marginTop:14,marginBottom:24}}>
          <div style={{fontSize:64,marginBottom:12}}>🌱</div>
          <Pill color={C.sky}>For teens</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"14px 0 10px",lineHeight:1.3}}>This is just for you</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,maxWidth:340,margin:"0 auto"}}>A private space to check in with yourself. Nothing is shared, nothing is saved outside your phone.</p>
        </div>
      </Fade>
      <Fade delay={150}>
        <Card style={{marginBottom:14,background:`linear-gradient(135deg,${C.skyLight} 0%,#f0f6ff 100%)`,border:`1.5px solid ${C.sky}44`}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:10}}>
            <span style={{fontSize:22,flexShrink:0}}>🤝</span>
            <div>
              <p style={{color:C.sky,fontWeight:800,fontSize:13,marginBottom:6}}>We want you to know</p>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7,marginBottom:8}}>A lot of teens feel things they can't explain. It's normal, and it's okay to ask for help. Many things get better when we talk about them.</p>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>If anything you share here worries us, we'll suggest talking to a trusted adult — a parent, teacher, school counsellor, older cousin, or a helpline. You don't have to deal with it alone.</p>
            </div>
          </div>
        </Card>
      </Fade>
      <Fade delay={250}>
        <Card style={{marginBottom:16,background:C.sageLight,border:`1.5px solid ${C.sage}44`}}>
          <p style={{color:C.sage,fontWeight:800,fontSize:13,marginBottom:4}}>🔒 Your privacy</p>
          <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>Your answers stay only on this phone. We don't show them to your parents, school, or anyone. Nothing is sent anywhere.</p>
        </Card>
      </Fade>
      <Fade delay={350}>
        <WarmButton onClick={onContinue} variant="primary" style={{background:C.sky,borderColor:C.sky}}>Start check-in →</WarmButton>
      </Fade>
    </div>
  );
}

function TeenResultScreen({phqa,gad,phqaAnswers,onExercises,onJournal,onHelp,onRetake}){
  // PHQ-A thresholds same as PHQ-9: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20+ severe
  const depSev = phqa<=4?{label:"Minimal",color:C.sage,icon:"🌱",desc:"It looks like you're doing okay right now."}
    : phqa<=9?{label:"Mild",color:C.sky,icon:"🌤️",desc:"Some things are weighing on you."}
    : phqa<=14?{label:"Moderate",color:C.amber,icon:"🌧️",desc:"You're carrying quite a lot right now."}
    : phqa<=19?{label:"Moderately Severe",color:C.peach,icon:"🌩️",desc:"Things are feeling really heavy."}
    : {label:"Severe",color:C.rose,icon:"⛈️",desc:"We're worried about you — and we're glad you answered honestly."};

  const anxSev = gad<=4?{label:"Minimal",color:C.sage}:gad<=9?{label:"Mild",color:C.sky}:gad<=14?{label:"Moderate",color:C.amber}:{label:"Severe",color:C.rose};
  const suicidalityEndorsed = phqaAnswers?.[8]!=="skip" && (phqaAnswers?.[8]||0)>0;
  const moderateOrWorse = phqa>=10 || gad>=10 || suicidalityEndorsed;
  const urgent = phqa>=20 || suicidalityEndorsed;

  const [revealPhase,setRevealPhase]=useState(0);
  useEffect(()=>{
    const t=[setTimeout(()=>setRevealPhase(1),300),setTimeout(()=>setRevealPhase(2),800),setTimeout(()=>setRevealPhase(3),1300)];
    return()=>t.forEach(clearTimeout);
  },[]);

  return(
    <div>
      {/* Hero */}
      <div style={{textAlign:"center",paddingTop:14,marginBottom:24}}>
        <div style={{fontSize:72,marginBottom:12,opacity:revealPhase>=1?1:0,transform:revealPhase>=1?"scale(1)":"scale(0.4)",transition:"all 0.7s cubic-bezier(0.34,1.56,0.64,1)"}}>
          {urgent?"💙":moderateOrWorse?"🫂":"🌸"}
        </div>
        <div style={{opacity:revealPhase>=1?1:0,transform:revealPhase>=1?"translateY(0)":"translateY(12px)",transition:"all 0.5s ease 0.15s"}}>
          <Pill color={depSev.color}>Your check-in</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"14px 0 10px",lineHeight:1.3}}>
            {urgent?"We hear you":moderateOrWorse?"Thank you for being honest":"You're doing alright"}
          </h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,maxWidth:340,margin:"0 auto"}}>{depSev.desc}</p>
        </div>
      </div>

      {/* URGENT: crisis box first */}
      {urgent && (
        <div style={{opacity:revealPhase>=1?1:0,transform:revealPhase>=1?"translateY(0)":"translateY(14px)",transition:"all 0.6s ease 0.3s"}}>
          <Card style={{marginBottom:16,background:C.roseLight,border:`2px solid ${C.rose}`}}>
            <p style={{color:C.rose,fontWeight:800,fontSize:16,marginBottom:8}}>💙 Please talk to someone today</p>
            <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:10}}>What you're feeling matters — and it can get better with the right support. Please tell <strong>one trusted adult</strong> (a parent, older sibling, teacher, school counsellor, or family doctor) how you've been feeling.</p>
            <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:12}}>If that feels too hard right now, call one of these — they're free, confidential, and used to talking with teens:</p>
            <div style={{color:C.text,fontSize:13,fontWeight:700,lineHeight:2.1}}>
              📞 <a href="tel:9152987821" style={{color:C.rose}}>iCall: 9152987821</a><br/>
              📞 <a href="tel:18602662345" style={{color:C.rose}}>Vandrevala 24/7: 1860-2662-345</a><br/>
              📞 <a href="tel:18002333330" style={{color:C.rose}}>CHILDLINE: 1098</a> (free for under-18)
            </div>
          </Card>
        </div>
      )}

      {/* Score cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16,opacity:revealPhase>=2?1:0,transform:revealPhase>=2?"translateY(0)":"translateY(14px)",transition:"all 0.6s ease"}}>
        <div style={{background:`linear-gradient(135deg,${depSev.color}14 0%,${depSev.color}05 100%)`,border:`1.5px solid ${depSev.color}44`,borderRadius:20,padding:"16px 12px",textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:2}}>{depSev.icon}</div>
          <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2}}>Mood</div>
          <div style={{color:depSev.color,fontWeight:800,fontSize:24,fontFamily:FD}}>{phqa}<span style={{fontSize:12,color:C.textMuted,fontFamily:FB}}>/27</span></div>
          <div style={{background:depSev.color+"22",color:depSev.color,fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:20,display:"inline-block",marginTop:4}}>{depSev.label}</div>
        </div>
        <div style={{background:`linear-gradient(135deg,${anxSev.color}14 0%,${anxSev.color}05 100%)`,border:`1.5px solid ${anxSev.color}44`,borderRadius:20,padding:"16px 12px",textAlign:"center"}}>
          <div style={{fontSize:28,marginBottom:2}}>🌪️</div>
          <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2}}>Worry</div>
          <div style={{color:anxSev.color,fontWeight:800,fontSize:24,fontFamily:FD}}>{gad}<span style={{fontSize:12,color:C.textMuted,fontFamily:FB}}>/21</span></div>
          <div style={{background:anxSev.color+"22",color:anxSev.color,fontSize:10,fontWeight:800,padding:"3px 8px",borderRadius:20,display:"inline-block",marginTop:4}}>{anxSev.label}</div>
        </div>
      </div>

      {/* Trusted adult card — always shown for teens */}
      <div style={{opacity:revealPhase>=3?1:0,transform:revealPhase>=3?"translateY(0)":"translateY(14px)",transition:"all 0.6s ease"}}>
        <Card style={{marginBottom:14,background:`linear-gradient(135deg,${C.peachLight} 0%,#fff4ee 100%)`,border:`1.5px solid ${C.peach}44`}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <span style={{fontSize:26,flexShrink:0}}>🤝</span>
            <div>
              <p style={{color:C.peach,fontWeight:800,fontSize:14,marginBottom:6}}>
                {moderateOrWorse?"Please share this with a trusted adult":"Still a good idea: talk to someone"}
              </p>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7,marginBottom:moderateOrWorse?8:0}}>
                {moderateOrWorse
                  ? "You don't have to explain everything. Even saying 'I've been feeling really low/anxious and I took a screen that said I might need to talk to someone' is enough. The right people will listen without judging."
                  : "Checking in with a parent, teacher, or counsellor is a healthy habit — not just when things feel bad. Even sharing 'I did a wellness check and my scores look okay' is a great conversation starter."}
              </p>
              {moderateOrWorse && (
                <p style={{color:C.textMid,fontSize:12,lineHeight:1.7,fontStyle:"italic"}}>If the first person you try doesn't get it, try another. It can take a couple of tries to find the right person.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Things you can do */}
        <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginTop:18,marginBottom:10}}>Things that might help right now</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={onExercises} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.sage}55`,background:`linear-gradient(135deg,${C.sageLight} 0%,#f0faf4 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:C.sage,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🌿</div>
            <div style={{flex:1}}><div style={{color:C.sage,fontWeight:800,fontSize:14,marginBottom:1}}>Try a calming exercise</div><div style={{color:C.textMid,fontSize:11}}>Breathing, grounding — quick things that actually help</div></div>
            <span style={{color:C.sage,fontSize:20}}>›</span>
          </button>
          <button onClick={onJournal} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.lavender}55`,background:`linear-gradient(135deg,${C.lavenderLight} 0%,#f6f2fc 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:C.lavender,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📖</div>
            <div style={{flex:1}}><div style={{color:C.lavender,fontWeight:800,fontSize:14,marginBottom:1}}>Write it out</div><div style={{color:C.textMid,fontSize:11}}>Getting things out of your head can help — private to your phone</div></div>
            <span style={{color:C.lavender,fontSize:20}}>›</span>
          </button>
          <button onClick={onHelp} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.rose}55`,background:`linear-gradient(135deg,${C.roseLight} 0%,#fcf0f2 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:C.rose,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💙</div>
            <div style={{flex:1}}><div style={{color:C.rose,fontWeight:800,fontSize:14,marginBottom:1}}>Talk to someone now</div><div style={{color:C.textMid,fontSize:11}}>Free helplines · made for young people</div></div>
            <span style={{color:C.rose,fontSize:20}}>›</span>
          </button>
        </div>
        <div style={{marginTop:12}}>
          <WarmButton onClick={onRetake} variant="ghost">↩ Start over</WarmButton>
        </div>

        {/* Small print */}
        <div style={{background:C.amberLight,border:`1px solid ${C.amber}33`,borderRadius:12,padding:"10px 14px",marginTop:18}}>
          <p style={{color:C.textMid,fontSize:11,lineHeight:1.65}}>⚠️ This is a self-screening tool, not a diagnosis. Mental health professionals can help you understand what's going on — please don't rely on this alone if things feel heavy.</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Postnatal pathway (Feature 13) ─────────────────────────────── */
function PostnatalCheckScreen({onAnswer,onBack}){
  // Asks the gateway question: are you pregnant or recently had a baby?
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <div style={{textAlign:"center",marginTop:18,marginBottom:24}}>
          <div style={{fontSize:56,marginBottom:12}}>🤱</div>
          <Pill color={C.rose}>A quick question</Pill>
          <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"14px 0 10px",lineHeight:1.35}}>Are you pregnant,<br/>or have you had a baby in the last year?</h2>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.7,maxWidth:320,margin:"0 auto"}}>Pregnancy and the postnatal period come with their own unique challenges. We can use a screening tool designed specifically for this time if it applies to you.</p>
        </div>
      </Fade>
      <Fade delay={150}>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
          <button onClick={()=>onAnswer(true)} style={{
            padding:"18px 20px",borderRadius:20,
            border:`2px solid ${C.rose}`,
            background:`linear-gradient(135deg,${C.roseLight} 0%,#fce0e3 100%)`,
            cursor:"pointer",textAlign:"left",fontFamily:FB,
            display:"flex",alignItems:"center",gap:14,
          }}>
            <div style={{width:48,height:48,borderRadius:14,background:C.rose,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>🌸</div>
            <div style={{flex:1}}>
              <div style={{color:C.rose,fontWeight:800,fontSize:15,marginBottom:2}}>Yes — I'm pregnant or recently had a baby</div>
              <div style={{color:C.textMid,fontSize:12}}>Use EPDS (perinatal depression screen)</div>
            </div>
            <span style={{color:C.rose,fontSize:22}}>›</span>
          </button>
          <button onClick={()=>onAnswer(false)} style={{
            padding:"16px 20px",borderRadius:18,
            border:`1.5px solid ${C.border}`,background:C.card,
            cursor:"pointer",textAlign:"left",fontFamily:FB,
            display:"flex",alignItems:"center",gap:12,
          }}>
            <div style={{width:44,height:44,borderRadius:13,background:C.peachLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📋</div>
            <div style={{flex:1}}>
              <div style={{color:C.text,fontWeight:700,fontSize:14}}>No — continue with the standard assessment</div>
              <div style={{color:C.textSoft,fontSize:11}}>PHQ-9 and GAD-7 pathway</div>
            </div>
            <span style={{color:C.textMuted,fontSize:20}}>›</span>
          </button>
        </div>
      </Fade>
      <Fade delay={280}>
        <div style={{background:C.sageLight,border:`1.5px solid ${C.sage}33`,borderRadius:12,padding:"10px 14px"}}>
          <p style={{color:C.textMid,fontSize:12,lineHeight:1.65}}>💡 <strong>Why we ask:</strong> Pregnancy and postnatal mental health are very common and very treatable — but often missed. The EPDS (Edinburgh Postnatal Depression Scale) is specifically validated for this time and asks different kinds of questions than the general PHQ-9.</p>
        </div>
      </Fade>
    </div>
  );
}

function PostnatalIntroScreen({onContinue,onBack}){
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <div style={{textAlign:"center",marginTop:14,marginBottom:24}}>
          <div style={{fontSize:64,marginBottom:12}}>🌸</div>
          <Pill color={C.rose}>EPDS · 10 questions</Pill>
          <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"14px 0 10px",lineHeight:1.3}}>Just for you, in this season</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,maxWidth:340,margin:"0 auto"}}>The Edinburgh Postnatal Depression Scale — 10 questions about how you've felt in the past 7 days. Takes about 3 minutes.</p>
        </div>
      </Fade>
      <Fade delay={150}>
        <Card style={{marginBottom:14,background:`linear-gradient(135deg,${C.roseLight} 0%,#fce8ea 100%)`,border:`1.5px solid ${C.rose}44`}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <span style={{fontSize:22,flexShrink:0}}>💛</span>
            <div>
              <p style={{color:C.rose,fontWeight:800,fontSize:13,marginBottom:6}}>There is no right way to feel</p>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7,marginBottom:8}}>Having a baby is a huge transition. Many mothers feel low, anxious, or overwhelmed — even when they also feel deep love for their baby. Both can be true at once.</p>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>This screen is common in maternity care worldwide. It exists because this season of life is hard, and you deserve support.</p>
            </div>
          </div>
        </Card>
      </Fade>
      <Fade delay={260}>
        <Card style={{marginBottom:16,background:C.sageLight,border:`1.5px solid ${C.sage}44`}}>
          <p style={{color:C.sage,fontWeight:800,fontSize:13,marginBottom:4}}>🔒 Your privacy</p>
          <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>Nothing leaves your phone. This is between you and yourself — partners, family, and doctors see nothing unless you choose to share.</p>
        </Card>
      </Fade>
      <Fade delay={360}>
        <WarmButton onClick={onContinue} variant="primary" style={{background:C.rose,borderColor:C.rose}}>Begin check-in →</WarmButton>
      </Fade>
    </div>
  );
}

/* EPDS uses custom per-question options — needs its own question runner */
function EPDSScreen({onComplete,onBack}){
  const [current,setCurrent]=useState(0);
  const [answers,setAnswers]=useState([]);
  const [selected,setSelected]=useState(null);
  const [visible,setVisible]=useState(true);
  const q=EPDS[current];
  const total=EPDS.length;

  const handleChoice=(val)=>{
    if(selected!==null) return;
    tapHaptic("light");
    setSelected(val);
    setTimeout(()=>{
      setVisible(false);
      setTimeout(()=>{
        const na=[...answers,val];
        if(current+1<total){
          setAnswers(na);
          setCurrent(c=>c+1);
          setSelected(null);
          setVisible(true);
        } else {
          playChime("complete");
          tapHaptic("medium");
          const score=na.reduce((a,b)=>a+b,0);
          onComplete(score,na);
        }
      },200);
    },500);
  };

  const handleBack=()=>{
    if(current>0){
      setAnswers(answers.slice(0,-1));
      setCurrent(c=>c-1);
      setSelected(null);
      setVisible(true);
    } else onBack();
  };

  return(
    <div>
      <BackBar onBack={handleBack} label={current>0?"Previous question":"Back"}/>
      {/* Progress dots */}
      <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:22,flexWrap:"wrap"}}>
        {EPDS.map((_,i)=>(
          <div key={i} style={{
            width:i===current?24:8,height:8,borderRadius:5,
            background:i<current?C.rose:i===current?C.rose:C.border,
            transition:"all 0.4s ease",
          }}/>
        ))}
      </div>
      <div style={{textAlign:"center",marginBottom:12}}>
        <Pill color={C.rose}>EPDS · Question {current+1} of {total}</Pill>
      </div>
      <div style={{opacity:visible?1:0,transform:visible?"translateY(0) scale(1)":"translateY(-6px) scale(0.98)",transition:"all 0.35s ease"}}>
        <Card style={{marginBottom:18,background:`linear-gradient(135deg,${C.roseLight} 0%,#ffffff 100%)`,border:`1.5px solid ${C.rose}33`,textAlign:"center",padding:"26px 22px"}}>
          <div style={{fontSize:44,marginBottom:12}}>{q.emoji}</div>
          <p style={{color:C.textSoft,fontSize:12,marginBottom:10,letterSpacing:0.3}}>In the past <strong>7 days</strong>…</p>
          <p style={{fontFamily:FD,color:C.text,fontSize:16,lineHeight:1.55,fontWeight:600}}>{q.q}</p>
        </Card>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:9}}>
        {q.options.map((opt,i)=>{
          const isSelected=selected===opt.value && answers.length===current;
          return(
            <button key={i} onClick={()=>handleChoice(opt.value)}
              style={{
                display:"flex",alignItems:"center",gap:12,padding:"13px 16px",
                border:`2px solid ${isSelected?C.rose:C.border}`,
                background:isSelected?C.rose+"15":C.card,
                borderRadius:14,cursor:selected!==null?"default":"pointer",
                textAlign:"left",width:"100%",fontFamily:FB,
                transition:"all 0.2s ease",
                opacity:selected!==null&&!isSelected?0.4:1,
                transform:isSelected?"scale(1.02)":"scale(1)",
              }}>
              <div style={{
                width:28,height:28,borderRadius:9,flexShrink:0,
                background:isSelected?C.rose:C.rose+"15",
                color:isSelected?C.white:C.rose,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontWeight:800,fontSize:12,
              }}>{isSelected?"✓":opt.value}</div>
              <div style={{flex:1,color:C.text,fontSize:14,fontWeight:600,lineHeight:1.45}}>{opt.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PostnatalResultScreen({score,answers,onExercises,onJournal,onHelp,onRetake,onPDF}){
  // EPDS scoring: ≥13 = probable major depression; 10-12 = probable minor; <10 = low likelihood
  // Item 10 (index 9) is suicidality — if endorsed (score > 0), urgent regardless of total
  const suicidalityScore = answers?.[9]||0;
  const suicidalityEndorsed = suicidalityScore>0;
  const urgent = suicidalityEndorsed || score>=15;

  const sev = score>=13 ? {label:"Probable major depression",color:C.rose,icon:"⛈️",desc:"Your score suggests postnatal depression that would benefit from professional support."}
    : score>=10 ? {label:"Probable minor depression",color:C.amber,icon:"🌧️",desc:"Your score suggests some symptoms of postnatal depression. Worth talking to someone."}
    : {label:"Low likelihood",color:C.sage,icon:"🌱",desc:"Your score is in the low range — but trust yourself. If you feel something is off, please reach out."};

  const [revealPhase,setRevealPhase]=useState(0);
  useEffect(()=>{
    const t=[setTimeout(()=>setRevealPhase(1),300),setTimeout(()=>setRevealPhase(2),800),setTimeout(()=>setRevealPhase(3),1300)];
    return()=>t.forEach(clearTimeout);
  },[]);

  return(
    <div>
      {/* Hero */}
      <div style={{textAlign:"center",paddingTop:14,marginBottom:24}}>
        <div style={{fontSize:72,marginBottom:12,opacity:revealPhase>=1?1:0,transform:revealPhase>=1?"scale(1)":"scale(0.4)",transition:"all 0.7s cubic-bezier(0.34,1.56,0.64,1)"}}>
          {urgent?"💙":score>=10?"🫂":"🌸"}
        </div>
        <div style={{opacity:revealPhase>=1?1:0,transform:revealPhase>=1?"translateY(0)":"translateY(12px)",transition:"all 0.5s ease 0.15s"}}>
          <Pill color={sev.color}>Your EPDS check-in</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"14px 0 10px",lineHeight:1.3}}>
            {urgent?"We hear you — and we're glad you answered honestly"
              : score>=13?"You're carrying a lot right now"
              : score>=10?"Some things are worth a gentle look"
              : "You're doing okay right now"}
          </h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,maxWidth:340,margin:"0 auto"}}>{sev.desc}</p>
        </div>
      </div>

      {/* URGENT banner if item 10 endorsed */}
      {urgent && (
        <div style={{opacity:revealPhase>=1?1:0,transform:revealPhase>=1?"translateY(0)":"translateY(14px)",transition:"all 0.6s ease 0.3s"}}>
          <Card style={{marginBottom:16,background:C.roseLight,border:`2px solid ${C.rose}`}}>
            <p style={{color:C.rose,fontWeight:800,fontSize:15,marginBottom:8}}>💙 Please reach out today</p>
            <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:10}}>
              {suicidalityEndorsed
                ? "You answered honestly to a hard question — that took courage. Thoughts of harming yourself during pregnancy or after a baby are more common than most people realise, and they are treatable with the right help."
                : "This is a heavy score. Postnatal depression is one of the most treatable conditions — and getting help early makes a big difference, both for you and your baby."}
            </p>
            <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:12}}>Please call your obstetrician, paediatrician, or family doctor today. If you can't, call one of these:</p>
            <div style={{color:C.text,fontSize:13,fontWeight:700,lineHeight:2.1}}>
              📞 <a href="tel:9152987821" style={{color:C.rose}}>iCall: 9152987821</a><br/>
              📞 <a href="tel:18602662345" style={{color:C.rose}}>Vandrevala 24/7: 1860-2662-345</a><br/>
              📞 <a href="tel:08046110007" style={{color:C.rose}}>NIMHANS Helpline: 080-46110007</a><br/>
              📞 <a href="tel:112" style={{color:C.rose}}>Emergency: 112</a>
            </div>
          </Card>
        </div>
      )}

      {/* Score card */}
      <div style={{opacity:revealPhase>=2?1:0,transform:revealPhase>=2?"translateY(0)":"translateY(14px)",transition:"all 0.6s ease"}}>
        <Card style={{marginBottom:14,background:`linear-gradient(135deg,${sev.color}14 0%,${sev.color}05 100%)`,border:`1.5px solid ${sev.color}44`,textAlign:"center",padding:"20px 18px"}}>
          <div style={{fontSize:34,marginBottom:4}}>{sev.icon}</div>
          <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2}}>EPDS total score</div>
          <div style={{color:sev.color,fontWeight:800,fontSize:36,fontFamily:FD,lineHeight:1,margin:"4px 0"}}>{score}<span style={{fontSize:16,color:C.textMuted,fontFamily:FB}}>/30</span></div>
          <div style={{background:sev.color+"22",color:sev.color,fontSize:12,fontWeight:800,padding:"4px 12px",borderRadius:20,display:"inline-block",marginTop:6}}>{sev.label}</div>
        </Card>
      </div>

      {/* Normalisation */}
      <div style={{opacity:revealPhase>=3?1:0,transform:revealPhase>=3?"translateY(0)":"translateY(14px)",transition:"all 0.6s ease"}}>
        <Card style={{marginBottom:14,background:`linear-gradient(135deg,${C.peachLight} 0%,#fff4ee 100%)`,border:`1.5px solid ${C.peach}33`}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <span style={{fontSize:22,flexShrink:0}}>🫂</span>
            <div>
              <p style={{color:C.peach,fontWeight:800,fontSize:13,marginBottom:6}}>You are far from alone</p>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7,marginBottom:6}}><strong>1 in 5 Indian mothers</strong> experience some form of perinatal depression or anxiety. Most never get diagnosed — not because they don't want help, but because no one asked.</p>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>You asked yourself. That's already a brave first step. 🌿</p>
            </div>
          </div>
        </Card>

        {/* Action CTA if moderate+ */}
        {score>=10 && (
          <Card style={{marginBottom:14,background:`linear-gradient(135deg,${sev.color} 0%,${sev.color}dd 100%)`,border:"none",color:C.white,padding:"20px"}}>
            <div style={{color:C.white,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8,opacity:0.92}}>Your one next step</div>
            <p style={{fontFamily:FD,fontSize:17,fontWeight:600,lineHeight:1.5,marginBottom:10}}>
              {score>=13
                ? "Please book an appointment with your obstetrician or a psychiatrist this week"
                : "Mention this to your obstetrician or family doctor at your next visit"}
            </p>
            <p style={{fontSize:13,lineHeight:1.7,opacity:0.92}}>
              {score>=13
                ? "Treatment in pregnancy and postpartum is safe and effective. Your doctor can assess you properly and discuss options — therapy, support groups, or (if needed) medication that's safe for breastfeeding."
                : "You don't need to wait until it's a crisis. Early conversation leads to easier solutions. Many women find talking alone helps more than they expected."}
            </p>
          </Card>
        )}

        {/* Actions */}
        <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginTop:18,marginBottom:10}}>Things you can do right now</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {score>=10 && (
            <button onClick={onPDF} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.indigo}55`,background:`linear-gradient(135deg,${C.indigoLight} 0%,#eff1fc 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:13,background:C.indigo,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📄</div>
              <div style={{flex:1}}><div style={{color:C.indigo,fontWeight:800,fontSize:14,marginBottom:1}}>Download your report</div><div style={{color:C.textMid,fontSize:11}}>Share with your obstetrician or doctor</div></div>
              <span style={{color:C.indigo,fontSize:20}}>›</span>
            </button>
          )}
          <button onClick={onExercises} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.sage}55`,background:`linear-gradient(135deg,${C.sageLight} 0%,#f0faf4 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:C.sage,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🌿</div>
            <div style={{flex:1}}><div style={{color:C.sage,fontWeight:800,fontSize:14,marginBottom:1}}>Try a calming exercise</div><div style={{color:C.textMid,fontSize:11}}>Brief grounding & breathing — safe in pregnancy</div></div>
            <span style={{color:C.sage,fontSize:20}}>›</span>
          </button>
          <button onClick={onJournal} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.lavender}55`,background:`linear-gradient(135deg,${C.lavenderLight} 0%,#f6f2fc 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:C.lavender,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📖</div>
            <div style={{flex:1}}><div style={{color:C.lavender,fontWeight:800,fontSize:14,marginBottom:1}}>Write it out</div><div style={{color:C.textMid,fontSize:11}}>Gentle prompts · private to this device</div></div>
            <span style={{color:C.lavender,fontSize:20}}>›</span>
          </button>
          <button onClick={onHelp} style={{width:"100%",padding:"16px 18px",borderRadius:18,border:`2px solid ${C.rose}55`,background:`linear-gradient(135deg,${C.roseLight} 0%,#fcf0f2 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:44,height:44,borderRadius:13,background:C.rose,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💙</div>
            <div style={{flex:1}}><div style={{color:C.rose,fontWeight:800,fontSize:14,marginBottom:1}}>Talk to someone now</div><div style={{color:C.textMid,fontSize:11}}>Free helplines · 24/7 confidential</div></div>
            <span style={{color:C.rose,fontSize:20}}>›</span>
          </button>
        </div>

        <div style={{marginTop:12}}>
          <WarmButton onClick={onRetake} variant="ghost">↩ Start over</WarmButton>
        </div>

        {/* Small print */}
        <div style={{background:C.amberLight,border:`1px solid ${C.amber}33`,borderRadius:12,padding:"10px 14px",marginTop:18}}>
          <p style={{color:C.textMid,fontSize:11,lineHeight:1.65}}>⚠️ The EPDS is a screening tool, not a diagnosis. A score below the threshold does not mean you have no concerns — please trust how you feel. If you are in any doubt, speak to your doctor.</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Welcome — animated warm home ───────────────────────────────── */
function AnimatedHero(){
  // Soft animated illustration: breathing flower with floating particles
  return(
    <div style={{position:"relative",width:180,height:180,margin:"0 auto 14px"}}>
      {/* ambient glow rings */}
      <div style={{position:"absolute",inset:0,borderRadius:"50%",background:`radial-gradient(circle,${C.peach}22 0%,transparent 70%)`,animation:"mhBreathe 4.5s ease-in-out infinite"}}/>
      <div style={{position:"absolute",inset:20,borderRadius:"50%",background:`radial-gradient(circle,${C.sage}22 0%,transparent 70%)`,animation:"mhBreathe 4.5s ease-in-out infinite 1.5s"}}/>
      <div style={{position:"absolute",inset:40,borderRadius:"50%",background:`radial-gradient(circle,${C.lavender}22 0%,transparent 70%)`,animation:"mhBreathe 4.5s ease-in-out infinite 3s"}}/>

      {/* floating particles */}
      <div style={{position:"absolute",top:18,left:30,fontSize:14,animation:"mhFloat1 6s ease-in-out infinite"}}>✨</div>
      <div style={{position:"absolute",top:35,right:22,fontSize:12,animation:"mhFloat2 7s ease-in-out infinite 1s"}}>🌿</div>
      <div style={{position:"absolute",bottom:30,left:20,fontSize:12,animation:"mhFloat3 5.5s ease-in-out infinite 0.5s"}}>💛</div>
      <div style={{position:"absolute",bottom:22,right:32,fontSize:14,animation:"mhFloat1 8s ease-in-out infinite 2s"}}>✨</div>

      {/* centre flower */}
      <div style={{
        position:"absolute",inset:0,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:78,
        animation:"mhBloom 4.5s ease-in-out infinite",
        filter:"drop-shadow(0 6px 16px rgba(232,132,90,0.25))",
      }}>🌸</div>

      <style>{`
        @keyframes mhBreathe{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.12);opacity:1}}
        @keyframes mhBloom{0%,100%{transform:scale(1) rotate(-2deg)}50%{transform:scale(1.08) rotate(2deg)}}
        @keyframes mhFloat1{0%,100%{transform:translateY(0) rotate(0deg);opacity:.6}50%{transform:translateY(-10px) rotate(10deg);opacity:1}}
        @keyframes mhFloat2{0%,100%{transform:translateY(0) rotate(0deg);opacity:.7}50%{transform:translateY(-8px) rotate(-8deg);opacity:1}}
        @keyframes mhFloat3{0%,100%{transform:translateY(0);opacity:.7}50%{transform:translateY(-6px);opacity:1}}
      `}</style>
    </div>
  );
}

function WelcomeScreen({onQuick,onFull,onMoodCheck,onPrivacy,onRefs}){
  // Rotating greeting based on time of day
  const hour=new Date().getHours();
  const greeting=hour<5?"Hello, night owl":hour<12?"Good morning":hour<17?"Good afternoon":hour<21?"Good evening":"Hello, night owl";

  return(
    <div style={{paddingTop:12}}>
      {/* Hero with animated illustration */}
      <div style={{textAlign:"center",marginBottom:8}}>
        <AnimatedHero/>
        <Fade delay={100}>
          <p style={{color:C.textSoft,fontSize:13,fontWeight:700,marginBottom:4}}>{greeting} 🌿</p>
          <h1 style={{fontFamily:FD,fontSize:38,fontWeight:700,color:C.text,marginBottom:4,letterSpacing:-0.5}}>ManaScreen</h1>
          <p style={{color:C.peach,fontFamily:FD,fontSize:16,fontStyle:"italic",marginBottom:2,lineHeight:1.5,maxWidth:320,marginLeft:"auto",marginRight:"auto"}}>A private space to understand how you're really feeling.</p>
        </Fade>
      </div>

      {/* Primary CTA — Quick Check (big, inviting) */}
      <Fade delay={250}>
        <button onClick={onQuick} style={{
          width:"100%",padding:"22px 20px",borderRadius:24,
          border:"none",
          background:`linear-gradient(135deg,${C.peach} 0%,#d9704a 100%)`,
          color:C.white,cursor:"pointer",textAlign:"left",fontFamily:FB,
          display:"flex",alignItems:"center",gap:14,marginTop:18,marginBottom:12,
          boxShadow:`0 10px 28px ${C.peach}55`,
          position:"relative",overflow:"hidden",
        }}>
          {/* shine animation */}
          <div style={{position:"absolute",top:0,left:-80,width:80,height:"100%",background:"linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)",animation:"heroShine 3.5s ease-in-out infinite"}}/>
          <div style={{width:56,height:56,borderRadius:16,background:"rgba(255,255,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0,backdropFilter:"blur(4px)"}}>⚡</div>
          <div style={{flex:1,zIndex:1}}>
            <div style={{fontWeight:800,fontSize:17,marginBottom:3}}>Start with a quick check</div>
            <div style={{fontSize:12,opacity:0.92,lineHeight:1.4}}>Just 4 questions · Takes 90 seconds</div>
          </div>
          <div style={{fontSize:26,zIndex:1}}>→</div>
          <style>{`@keyframes heroShine{0%,100%{transform:translateX(0)}50%{transform:translateX(500px)}}`}</style>
        </button>
      </Fade>

      {/* Secondary CTA — Full assessment (understated) */}
      <Fade delay={350}>
        <button onClick={onFull} style={{
          width:"100%",padding:"15px 18px",borderRadius:18,
          border:`1.5px solid ${C.border}`,background:C.card,
          cursor:"pointer",textAlign:"left",fontFamily:FB,
          display:"flex",alignItems:"center",gap:12,marginBottom:18,
        }}>
          <div style={{width:40,height:40,borderRadius:12,background:C.peachLight,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>📋</div>
          <div style={{flex:1}}>
            <div style={{color:C.text,fontWeight:700,fontSize:14}}>Or take the full assessment</div>
            <div style={{color:C.textSoft,fontSize:11,marginTop:1}}>10–15 minutes · clinical report for your doctor</div>
          </div>
          <span style={{color:C.textMuted,fontSize:20}}>›</span>
        </button>
      </Fade>

      {/* Trust row — compact horizontal */}
      <Fade delay={450}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18}}>
          {[
            {icon:"🔒",title:"Private",sub:"Nothing saved"},
            {icon:"🏥",title:"Clinical",sub:"DSM-5 aligned"},
            {icon:"🇮🇳",title:"For India",sub:"Built by a doctor"},
          ].map(t=>(
            <div key={t.title} style={{textAlign:"center",padding:"12px 8px",background:C.card,borderRadius:14,border:`1px solid ${C.border}`}}>
              <div style={{fontSize:22,marginBottom:4}}>{t.icon}</div>
              <div style={{color:C.text,fontWeight:800,fontSize:12}}>{t.title}</div>
              <div style={{color:C.textSoft,fontSize:10,marginTop:1}}>{t.sub}</div>
            </div>
          ))}
        </div>
      </Fade>

      {/* Gentle invitation quote */}
      <Fade delay={550}>
        <Card style={{marginBottom:16,background:`linear-gradient(135deg,${C.peachLight} 0%,#fff4ee 100%)`,border:`1.5px solid ${C.peach}33`,textAlign:"center"}}>
          <p style={{fontFamily:FD,color:C.textMid,fontSize:15,lineHeight:1.8,fontStyle:"italic"}}>"You don't have to figure it all out today. Just showing up here is enough."</p>
        </Card>
      </Fade>

      {/* Crisis note */}
      <Fade delay={650}>
        <div style={{background:C.roseLight,border:`1.5px solid ${C.rose}44`,borderRadius:14,padding:"12px 14px",marginBottom:14,textAlign:"left"}}>
          <div style={{color:C.rose,fontWeight:800,fontSize:12,marginBottom:3}}>💙 Need help right now?</div>
          <div style={{color:C.textMid,fontSize:12,lineHeight:1.65}}>Tap the 💙 button anytime. iCall <strong>9152987821</strong> · Vandrevala <strong>1860-2662-345</strong></div>
        </div>
        <div style={{display:"flex",gap:14,justifyContent:"center",fontSize:12,marginBottom:8}}>
          <button onClick={onPrivacy} style={{background:"none",border:"none",color:C.textSoft,textDecoration:"underline",cursor:"pointer",fontFamily:FB,fontSize:12}}>🔒 Privacy</button>
          <button onClick={onRefs} style={{background:"none",border:"none",color:C.textSoft,textDecoration:"underline",cursor:"pointer",fontFamily:FB,fontSize:12}}>📚 References</button>
        </div>
      </Fade>
    </div>
  );
}

/* ─── Who screen ─────────────────────────────────────────────────── */
function WhoScreen({onSelect,onBack}){
  const whoOpts=[
    {icon:"🙋",label:"I'm checking in on myself",sub:"For my own wellbeing",val:"self"},
    {icon:"👨‍👩‍👧",label:"I'm a family member or caregiver",sub:"For someone I love",val:"caregiver"},
    {icon:"🩺",label:"I already see a specialist",sub:"Tracking between visits",val:"existing"},
  ];
  return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <Pill color={C.peach}>Step 1</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>Who is this for today?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:22}}>This helps us personalise your assessment.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {whoOpts.map((o,i)=>(
          <Fade key={o.val} delay={i*80}>
            <button onClick={()=>onSelect(o.val)} style={{display:"flex",alignItems:"center",gap:14,padding:"18px",background:C.card,border:`2px solid ${C.border}`,borderRadius:18,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s"}}>
              <span style={{fontSize:28}}>{o.icon}</span>
              <div><div style={{color:C.text,fontWeight:800,fontSize:14}}>{o.label}</div><div style={{color:C.textSoft,fontSize:12,marginTop:2}}>{o.sub}</div></div>
              <span style={{marginLeft:"auto",color:C.textMuted,fontSize:20}}>›</span>
            </button>
          </Fade>
        ))}
      </div>
    </div>
  );
}

/* ─── Resume prompt ──────────────────────────────────────────────── */
function ResumePrompt({savedAt,onResume,onStartOver}){
  const mins=Math.round((Date.now()-savedAt)/60000);
  const timeAgo=mins<1?"just now":mins<60?`${mins} min ago`:`${Math.round(mins/60)} hr ago`;
  return(
    <div style={{textAlign:"center",paddingTop:24}}>
      <Fade>
        <div style={{fontSize:52,marginBottom:14}}>🌱</div>
        <Pill color={C.sage}>Welcome back</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 10px"}}>You have an assessment in progress</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:22}}>You started {timeAgo}. Would you like to continue where you left off?</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <WarmButton onClick={onResume} variant="sage">Continue where I left off →</WarmButton>
          <WarmButton onClick={onStartOver} variant="secondary">Start over</WarmButton>
        </div>
        <p style={{color:C.textMuted,fontSize:11,marginTop:14,lineHeight:1.6}}>Your progress is saved only on this device and auto-deletes after 24 hours.</p>
      </Fade>
    </div>
  );
}

/* ─── ROOT APP ───────────────────────────────────────────────────── */
const STEP={
  WELCOME:"welcome",
  MOOD:"mood",
  QUICK:"quick", QUICK_RESULT:"quick_result",
  WHO:"who", PROFILE:"profile",
  MEDICAL:"medical", MEDS:"meds", DURATION:"duration",
  PHQ9:"phq9", BRIDGE:"bridge", GAD7:"gad7",
  CSSRS:"cssrs",
  TW_PHQ15:"tw_phq15", PHQ15:"phq15",
  TW_MDQ:"tw_mdq", MDQ:"mdq",
  TW_TRAUMA:"tw_trauma", TRAUMA:"trauma",
  SLEEP:"sleep", PSYCHOSIS:"psychosis", FUNCTIONAL:"functional",
  WINDDOWN:"winddown",
  RESULT:"result", EXERCISES:"exercises", FAQ:"faq", LEARN:"learn",
  JOURNAL:"journal",
  // Adolescent pathway (Feature 12)
  TEEN_INTRO:"teen_intro", TEEN_PHQA:"teen_phqa", TEEN_GAD:"teen_gad", TEEN_RESULT:"teen_result",
  // Postnatal pathway (Feature 13)
  POSTNATAL_CHECK:"postnatal_check", POSTNATAL_INTRO:"postnatal_intro", POSTNATAL_EPDS:"postnatal_epds", POSTNATAL_RESULT:"postnatal_result",
  PRIVACY:"privacy", REFS:"refs", PDF:"pdf",
};
const SAVEABLE_STEPS=[STEP.WHO,STEP.PROFILE,STEP.MEDICAL,STEP.MEDS,STEP.DURATION,STEP.PHQ9,STEP.BRIDGE,STEP.GAD7,STEP.TW_PHQ15,STEP.PHQ15,STEP.TW_MDQ,STEP.MDQ,STEP.TW_TRAUMA,STEP.TRAUMA,STEP.SLEEP,STEP.PSYCHOSIS,STEP.FUNCTIONAL,STEP.TEEN_INTRO,STEP.TEEN_PHQA,STEP.TEEN_GAD,STEP.POSTNATAL_CHECK,STEP.POSTNATAL_INTRO,STEP.POSTNATAL_EPDS];

export default function App(){
  const [step,setStep]=useState(STEP.WELCOME);
  const [who,setWho]=useState("self");
  const [data,setData]=useState({});
  const [history,setHistory]=useState([]);
  const [moodLog,setMoodLog]=useState([]);
  const [helpOpen,setHelpOpen]=useState(false);
  const [showResume,setShowResume]=useState(false);
  const [savedState,setSavedState]=useState(null);
  const [showInstallPrompt,setShowInstallPrompt]=useState(false);
  const [installEvent,setInstallEvent]=useState(null);

  // Load saved progress + history + mood log on mount
  useEffect(()=>{
    try{
      const raw=window.localStorage?.getItem(SAVE_KEY);
      if(raw){
        const parsed=JSON.parse(raw);
        const ageH=(Date.now()-parsed.savedAt)/(1000*60*60);
        if(ageH>SAVE_EXPIRY_H)window.localStorage.removeItem(SAVE_KEY);
        else if(parsed.step&&SAVEABLE_STEPS.includes(parsed.step)){setSavedState(parsed);setShowResume(true);}
      }
      const hRaw=window.localStorage?.getItem(HISTORY_KEY);
      if(hRaw) setHistory(JSON.parse(hRaw));
      const mRaw=window.localStorage?.getItem(MOODLOG_KEY);
      if(mRaw) setMoodLog(JSON.parse(mRaw));
    }catch(e){}

    // Register service worker for PWA (Feature 4)
    if("serviceWorker" in navigator){
      window.addEventListener("load",()=>{
        navigator.serviceWorker.register("/sw.js").catch(()=>{});
      });
    }

    // Capture install prompt for PWA
    const handler=(e)=>{
      e.preventDefault();
      setInstallEvent(e);
      // Only show prompt if user has used the app (has history or mood log)
      const hasEngagement=storage.get(HISTORY_KEY,[]).length>0||storage.get(MOODLOG_KEY,[]).length>0;
      if(hasEngagement) setTimeout(()=>setShowInstallPrompt(true),2000);
    };
    window.addEventListener("beforeinstallprompt",handler);
    return()=>window.removeEventListener("beforeinstallprompt",handler);
  },[]);

  // Refresh moodLog from storage when returning to welcome (in case mood was logged)
  const refreshMoodLog=()=>{
    const m=storage.get(MOODLOG_KEY,[]);
    setMoodLog(m);
  };

  // Auto-save on step/data change
  useEffect(()=>{
    if(showResume)return;
    try{
      if(SAVEABLE_STEPS.includes(step)){
        window.localStorage?.setItem(SAVE_KEY,JSON.stringify({step,who,data,savedAt:Date.now()}));
      } else if(step===STEP.RESULT && data.phq9!==undefined){
        window.localStorage?.removeItem(SAVE_KEY);
        // Save to history if not already saved
        const lastEntry=history[history.length-1];
        const isNewAssessment=!lastEntry||(Date.now()-lastEntry.when)>60000;
        if(isNewAssessment&&data.phq9!==undefined&&data.gad7!==undefined){
          const newHistory=[...history,{when:Date.now(),phq9:data.phq9,gad7:data.gad7,type:"adult"}].slice(-10);
          setHistory(newHistory);
          window.localStorage?.setItem(HISTORY_KEY,JSON.stringify(newHistory));
        }
      } else if(step===STEP.TEEN_RESULT && data.phqa!==undefined){
        window.localStorage?.removeItem(SAVE_KEY);
        const lastEntry=history[history.length-1];
        const isNewAssessment=!lastEntry||(Date.now()-lastEntry.when)>60000;
        if(isNewAssessment){
          const newHistory=[...history,{when:Date.now(),phq9:data.phqa,gad7:data.teenGad||0,type:"teen"}].slice(-10);
          setHistory(newHistory);
          window.localStorage?.setItem(HISTORY_KEY,JSON.stringify(newHistory));
        }
      } else if(step===STEP.POSTNATAL_RESULT && data.epds!==undefined){
        window.localStorage?.removeItem(SAVE_KEY);
        const lastEntry=history[history.length-1];
        const isNewAssessment=!lastEntry||(Date.now()-lastEntry.when)>60000;
        if(isNewAssessment){
          const newHistory=[...history,{when:Date.now(),epds:data.epds,type:"postnatal"}].slice(-10);
          setHistory(newHistory);
          window.localStorage?.setItem(HISTORY_KEY,JSON.stringify(newHistory));
        }
      }
    }catch(e){}
  },[step,who,data,showResume]);

  const update=(key,val)=>setData(d=>({...d,[key]:val}));

  const resumeProgress=()=>{
    if(savedState){setStep(savedState.step);setWho(savedState.who||"self");setData(savedState.data||{});}
    setShowResume(false);setSavedState(null);
  };
  const clearAndStart=()=>{
    try{window.localStorage?.removeItem(SAVE_KEY);}catch(e){}
    setShowResume(false);setSavedState(null);setStep(STEP.WELCOME);setData({});
  };
  const reset=()=>{
    try{window.localStorage?.removeItem(SAVE_KEY);}catch(e){}
    setStep(STEP.WELCOME);setData({});
  };

  // Flow control — scores are passed through the chain to avoid React stale-state issues
  const afterPHQ9=(score,answers)=>{
    update("phq9",score);update("phq9answers",answers);
    setStep(STEP.BRIDGE);
  };
  const afterGAD7=(score,answers)=>{
    update("gad7",score);update("gad7answers",answers);
    const phq9ans=data.phq9answers||[];
    const suicidalityEndorsed=phq9ans[8]!==undefined&&phq9ans[8]!=="skip"&&phq9ans[8]>0;
    const phq9=data.phq9||0;
    const gad7=score; // use fresh score, not data.gad7 which is stale
    if(suicidalityEndorsed) setStep(STEP.CSSRS);
    else afterSafety({level:0,safe:true},phq9,gad7);
  };
  const afterSafety=(s,phq9Fresh,gad7Fresh)=>{
    update("safety",s);
    const phq9=phq9Fresh!==undefined?phq9Fresh:(data.phq9||0);
    const gad7=gad7Fresh!==undefined?gad7Fresh:(data.gad7||0);
    if(phq9>=5||gad7>=5) setStep(STEP.TW_PHQ15);
    else setStep(STEP.FUNCTIONAL);
  };
  const afterPHQ15=(score)=>{
    update("phq15",score);
    const phq9=data.phq9||0;
    const gad7=data.gad7||0;
    if(phq9>=5) setStep(STEP.TW_MDQ);
    else if(gad7>=5) setStep(STEP.TW_TRAUMA);
    else setStep(STEP.SLEEP);
  };
  const afterMDQ=(m)=>{update("mdq",m);setStep(STEP.TW_TRAUMA);};
  const afterTrauma=(t)=>{update("trauma",t);setStep(STEP.SLEEP);};
  const afterSleep=(s)=>{
    update("sleep",s);
    const phq9=data.phq9||0, gad7=data.gad7||0;
    if((phq9>=10||gad7>=10)&&["18-25","26-40"].includes(data.profile?.ageGroup)) setStep(STEP.PSYCHOSIS);
    else setStep(STEP.FUNCTIONAL);
  };
  const afterPsychosis=(p)=>{update("psychosis",p);setStep(STEP.FUNCTIONAL);};
  const afterFunctional=(f)=>{
    update("functional",f);
    const phq9=data.phq9||0, gad7=data.gad7||0;
    const hadHeavy=phq9>=10||gad7>=10||data.safety?.level>0||data.trauma?.positive;
    if(hadHeavy) setStep(STEP.WINDDOWN);
    else setStep(STEP.RESULT);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:FB,position:"relative"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=Nunito:wght@400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        button{outline:none;}
        input:focus,textarea:focus{border-color:#e8845a!important;box-shadow:0 0 0 3px #e8845a22!important;}
        ::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:#e0d0c8;border-radius:2px;}
      `}</style>
      <BgDecor/>
      <HelpNowButton active={helpOpen} onToggle={()=>setHelpOpen(h=>!h)}/>

      {/* PWA install prompt (Feature 4) */}
      {showInstallPrompt && installEvent && (
        <div style={{
          position:"fixed",top:16,left:16,right:16,zIndex:120,
          maxWidth:410,margin:"0 auto",
          background:C.white,
          borderRadius:16,
          border:`2px solid ${C.peach}`,
          padding:"14px 16px",
          boxShadow:"0 10px 32px rgba(0,0,0,0.18)",
          display:"flex",alignItems:"center",gap:12,
          animation:"pwaSlide 0.45s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <div style={{fontSize:30}}>🌸</div>
          <div style={{flex:1}}>
            <div style={{color:C.text,fontWeight:800,fontSize:13,marginBottom:2}}>Add ManaScreen to home screen</div>
            <div style={{color:C.textSoft,fontSize:11,lineHeight:1.5}}>Opens like a real app · works offline</div>
          </div>
          <button onClick={async ()=>{
            try{
              installEvent.prompt();
              await installEvent.userChoice;
            }catch(e){}
            setShowInstallPrompt(false);
            setInstallEvent(null);
          }} style={{
            padding:"8px 14px",background:C.peach,color:C.white,
            border:"none",borderRadius:10,fontWeight:800,fontSize:12,
            fontFamily:FB,cursor:"pointer",
          }}>Install</button>
          <button onClick={()=>setShowInstallPrompt(false)} style={{
            background:"none",border:"none",color:C.textMuted,fontSize:18,cursor:"pointer",padding:"4px 6px",
          }}>✕</button>
          <style>{`@keyframes pwaSlide{from{transform:translateY(-30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        </div>
      )}
      <div style={{position:"relative",zIndex:1,maxWidth:440,margin:"0 auto",padding:"24px 20px 90px"}}>
        {showResume ? (
          <ResumePrompt savedAt={savedState?.savedAt||Date.now()} onResume={resumeProgress} onStartOver={clearAndStart}/>
        ) : (
        <>
          {step!==STEP.WELCOME&&(
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <div style={{fontFamily:FD,color:C.peach,fontWeight:700,fontSize:18}}>🌸 ManaScreen</div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                {SAVEABLE_STEPS.includes(step)&&<span style={{color:C.sage,fontSize:10,fontWeight:700,display:"flex",alignItems:"center",gap:3}}>💾 Saved</span>}
                {[STEP.RESULT,STEP.EXERCISES,STEP.FAQ,STEP.LEARN,STEP.PDF,STEP.QUICK_RESULT,STEP.TEEN_RESULT,STEP.POSTNATAL_RESULT,STEP.JOURNAL].includes(step)&&<button onClick={reset} style={{background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:12,fontFamily:FB}}>Start over</button>}
              </div>
            </div>
          )}

          {step===STEP.WELCOME && (
            (history.length>0||moodLog.length>0) ? (
              <ReturningDashboard
                history={history}
                moodLog={moodLog}
                onMoodCheck={()=>setStep(STEP.MOOD)}
                onQuick={()=>setStep(STEP.QUICK)}
                onFull={()=>setStep(STEP.WHO)}
                onExercises={()=>{setData(d=>({...d,_exerciseReturn:"dashboard",_exerciseFeeling:null}));setStep(STEP.EXERCISES);}}
                onJournal={()=>{setData(d=>({...d,_journalReturn:"dashboard"}));setStep(STEP.JOURNAL);}}
                onResultsView={()=>setStep(STEP.RESULT)}
                onPrivacy={()=>setStep(STEP.PRIVACY)}
                onRefs={()=>setStep(STEP.REFS)}/>
            ) : (
              <WelcomeScreen
                onQuick={()=>setStep(STEP.QUICK)}
                onFull={()=>setStep(STEP.WHO)}
                onMoodCheck={()=>setStep(STEP.MOOD)}
                onPrivacy={()=>setStep(STEP.PRIVACY)}
                onRefs={()=>setStep(STEP.REFS)}/>
            )
          )}

          {step===STEP.MOOD && <MoodCheckScreen
            onDone={()=>{refreshMoodLog();setStep(STEP.WELCOME);}}
            onBack={()=>setStep(STEP.WELCOME)}/>}

          {step===STEP.QUICK && <QuickCheckScreen
            onBack={()=>setStep(STEP.WELCOME)}
            onGoFull={()=>setStep(STEP.WHO)}
            onComplete={(r)=>{
              setData(d=>({...d,...r}));
              setStep(STEP.QUICK_RESULT);
            }}/>}
          {step===STEP.QUICK_RESULT && <QuickCheckResult
            phq2={data.phq2||0} gad2={data.gad2||0}
            onGoFull={()=>setStep(STEP.WHO)}
            onDone={()=>{setHelpOpen(false);setStep(STEP.WELCOME);setData({});}}
            onHelp={()=>setHelpOpen(true)}/>}

          {step===STEP.WHO && <WhoScreen onSelect={v=>{setWho(v);update("who",v);setStep(STEP.PROFILE);}} onBack={()=>setStep(STEP.WELCOME)}/>}
          {step===STEP.PROFILE && <ProfileScreen initial={data.profile} onComplete={p=>{
            update("profile",p);
            // Adolescent pathway if under 18
            if(p.ageGroup==="under18"){ setStep(STEP.TEEN_INTRO); return; }
            // Postnatal gate if female and of reproductive age
            if(p.gender==="female" && ["18-25","26-40"].includes(p.ageGroup)){
              setStep(STEP.POSTNATAL_CHECK); return;
            }
            // Default adult flow
            setStep(STEP.MEDICAL);
          }} onBack={()=>setStep(STEP.WHO)}/>}

          {/* ─ Adolescent pathway (Feature 12) ─ */}
          {step===STEP.TEEN_INTRO && <TeenIntroScreen onContinue={()=>setStep(STEP.TEEN_PHQA)} onBack={()=>setStep(STEP.PROFILE)}/>}
          {step===STEP.TEEN_PHQA && <LikertScreen key="teen_phqa" questions={PHQA} code="PHQ-A" color={C.sky} bgColor={C.skyLight} sectionTitle="Mood — teen version" options={FREQ4}
            onComplete={(score,answers)=>{update("phqa",score);update("phqaAnswers",answers);setStep(STEP.TEEN_GAD);}}
            onBack={()=>setStep(STEP.TEEN_INTRO)} allowSkip={false}/>}
          {step===STEP.TEEN_GAD && <LikertScreen key="teen_gad" questions={GAD7} code="GAD-7" color={C.sage} bgColor={C.sageLight} sectionTitle="Worry" options={FREQ4}
            onComplete={(score,answers)=>{update("teenGad",score);update("teenGadAnswers",answers);setStep(STEP.TEEN_RESULT);}}
            onBack={()=>setStep(STEP.TEEN_PHQA)} allowSkip={false}/>}
          {step===STEP.TEEN_RESULT && <TeenResultScreen
            phqa={data.phqa||0} gad={data.teenGad||0} phqaAnswers={data.phqaAnswers||[]}
            onExercises={()=>{setData(d=>({...d,_exerciseReturn:"teen_result",_exerciseFeeling:null}));setStep(STEP.EXERCISES);}}
            onJournal={()=>{setData(d=>({...d,_journalReturn:"teen_result"}));setStep(STEP.JOURNAL);}}
            onHelp={()=>setHelpOpen(true)}
            onRetake={reset}/>}

          {/* ─ Postnatal pathway (Feature 13) ─ */}
          {step===STEP.POSTNATAL_CHECK && <PostnatalCheckScreen
            onAnswer={(isPostnatal)=>{
              update("isPostnatal",isPostnatal);
              if(isPostnatal) setStep(STEP.POSTNATAL_INTRO);
              else setStep(STEP.MEDICAL);
            }}
            onBack={()=>setStep(STEP.PROFILE)}/>}
          {step===STEP.POSTNATAL_INTRO && <PostnatalIntroScreen onContinue={()=>setStep(STEP.POSTNATAL_EPDS)} onBack={()=>setStep(STEP.POSTNATAL_CHECK)}/>}
          {step===STEP.POSTNATAL_EPDS && <EPDSScreen onComplete={(score,answers)=>{update("epds",score);update("epdsAnswers",answers);setStep(STEP.POSTNATAL_RESULT);}} onBack={()=>setStep(STEP.POSTNATAL_INTRO)}/>}
          {step===STEP.POSTNATAL_RESULT && <PostnatalResultScreen
            score={data.epds||0} answers={data.epdsAnswers||[]}
            onExercises={()=>{setData(d=>({...d,_exerciseReturn:"postnatal_result",_exerciseFeeling:null}));setStep(STEP.EXERCISES);}}
            onJournal={()=>{setData(d=>({...d,_journalReturn:"postnatal_result"}));setStep(STEP.JOURNAL);}}
            onHelp={()=>setHelpOpen(true)}
            onPDF={()=>setStep(STEP.PDF)}
            onRetake={reset}/>}

          {step===STEP.MEDICAL && <MedicalHistoryScreen initial={data.medical} onComplete={m=>{update("medical",m);setStep(m.meds==="Yes"?STEP.MEDS:STEP.DURATION);}} onBack={()=>setStep(data.isPostnatal===false?STEP.POSTNATAL_CHECK:STEP.PROFILE)}/>}
          {step===STEP.MEDS && <MedicationsScreen initial={data.meds} onComplete={m=>{update("meds",m);setStep(STEP.DURATION);}} onBack={()=>setStep(STEP.MEDICAL)}/>}
          {step===STEP.DURATION && <DurationScreen initial={data.duration} onComplete={d=>{update("duration",d);setStep(STEP.PHQ9);}} onBack={()=>setStep(data.medical?.meds==="Yes"?STEP.MEDS:STEP.MEDICAL)}/>}

          {step===STEP.PHQ9 && <LikertScreen key="phq9" questions={PHQ9} code="PHQ-9" color={C.sky} bgColor={C.skyLight} sectionTitle="Depression" options={FREQ4} onComplete={afterPHQ9} onBack={()=>setStep(STEP.DURATION)} answeredSoFar={data.phq9answers||[]}/>}
          {step===STEP.BRIDGE && <SectionBridge title="Halfway there 🌿" message={`You've completed the depression screen. You're doing wonderfully.\n\nNext: 7 questions about anxiety. Take a breath when you're ready.`} emoji="🌿" color={C.sage} buttonLabel="Continue →" onNext={()=>setStep(STEP.GAD7)}/>}
          {step===STEP.GAD7 && <LikertScreen key="gad7" questions={GAD7} code="GAD-7" color={C.sage} bgColor={C.sageLight} sectionTitle="Anxiety" options={FREQ4} onComplete={afterGAD7} onBack={()=>setStep(STEP.BRIDGE)} answeredSoFar={data.gad7answers||[]}/>}
          {step===STEP.CSSRS && <SafetyScreen onComplete={s=>{update("safety",s);afterSafety(s,data.phq9||0,data.gad7||0);}}/>}

          {step===STEP.TW_PHQ15 && <TriggerWarning title="Next: physical symptoms" message="These next questions are about any physical symptoms you may be having. Many of these are very common in Indian presentations of depression and anxiety. This takes about 3 minutes." emoji="🫄" color={C.amber} onContinue={()=>setStep(STEP.PHQ15)} onSkipSection={()=>{update("phq15",0);setStep(STEP.SLEEP);}}/>}
          {step===STEP.PHQ15 && <LikertScreen key="phq15" questions={PHQ15} code="PHQ-15" color={C.amber} bgColor={C.amberLight} sectionTitle="Physical Symptoms" options={FREQ3} onComplete={afterPHQ15} onBack={()=>setStep(STEP.TW_PHQ15)}/>}

          {step===STEP.TW_MDQ && <TriggerWarning title="Next: mood episodes" message="These questions explore whether you've ever experienced periods of unusually high or irritable mood. Even if you're not sure, it's worth answering — this can significantly affect what kind of help is most useful." emoji="🌓" color={C.lavender} onContinue={()=>setStep(STEP.MDQ)} onSkipSection={()=>{update("mdq",{positive:false,skipped:true});setStep(STEP.TW_TRAUMA);}}/>}
          {step===STEP.MDQ && <MDQScreen onComplete={afterMDQ} onBack={()=>setStep(STEP.TW_MDQ)}/>}

          {step===STEP.TW_TRAUMA && <TriggerWarning title="Next: difficult experiences" message="The next questions touch on difficult or traumatic experiences. You don't need to share any details — only Yes or No. Take your time, and skip anything you're not ready for." emoji="🌸" color={C.rose} onContinue={()=>setStep(STEP.TRAUMA)} onSkipSection={()=>{update("trauma",{positive:false,skipped:true});setStep(STEP.SLEEP);}}/>}
          {step===STEP.TRAUMA && <TraumaScreen onComplete={afterTrauma} onBack={()=>setStep(STEP.TW_TRAUMA)}/>}

          {step===STEP.SLEEP && <SleepScreen onComplete={afterSleep} onBack={()=>setStep(data.trauma?STEP.TRAUMA:STEP.MEDICAL)}/>}
          {step===STEP.PSYCHOSIS && <PsychosisScreen onComplete={afterPsychosis} onBack={()=>setStep(STEP.SLEEP)}/>}
          {step===STEP.FUNCTIONAL && <FunctionalScreen initial={data.functional} onComplete={afterFunctional} onBack={()=>setStep(data.psychosis?STEP.PSYCHOSIS:STEP.SLEEP)}/>}

          {step===STEP.WINDDOWN && <WindDown onContinue={()=>setStep(STEP.RESULT)}/>}

          {step===STEP.RESULT && <ResultScreen data={data} history={history} onExercises={(f)=>{setData(d=>({...d,_exerciseFeeling:f||null}));setStep(STEP.EXERCISES);}} onFAQ={()=>setStep(STEP.FAQ)} onLearn={()=>setStep(STEP.LEARN)} onPDF={()=>setStep(STEP.PDF)} onJournal={()=>{setData(d=>({...d,_journalReturn:"result"}));setStep(STEP.JOURNAL);}} onRetake={reset}/>}
          {step===STEP.EXERCISES && <ExercisesScreen onDone={()=>{
            const r=data._exerciseReturn;
            if(r==="dashboard") setStep(STEP.WELCOME);
            else if(r==="teen_result") setStep(STEP.TEEN_RESULT);
            else if(r==="postnatal_result") setStep(STEP.POSTNATAL_RESULT);
            else setStep(STEP.RESULT);
          }} initialFeeling={data._exerciseFeeling||null}/>}
          {step===STEP.JOURNAL && <JournalScreen onBack={()=>{
            const r=data._journalReturn;
            if(r==="dashboard") setStep(STEP.WELCOME);
            else if(r==="teen_result") setStep(STEP.TEEN_RESULT);
            else if(r==="postnatal_result") setStep(STEP.POSTNATAL_RESULT);
            else setStep(STEP.RESULT);
          }} onDone={()=>{
            const r=data._journalReturn;
            if(r==="dashboard") setStep(STEP.WELCOME);
            else if(r==="teen_result") setStep(STEP.TEEN_RESULT);
            else if(r==="postnatal_result") setStep(STEP.POSTNATAL_RESULT);
            else setStep(STEP.RESULT);
          }}/>}
          {step===STEP.FAQ && <FAQScreen phq9={data.phq9||0} gad7={data.gad7||0} onBack={()=>setStep(STEP.RESULT)}/>}
          {step===STEP.LEARN && <LearnScreen onBack={()=>setStep(STEP.RESULT)}/>}
          {step===STEP.PRIVACY && <PrivacyScreen onBack={()=>setStep(STEP.WELCOME)}/>}
          {step===STEP.REFS && <ReferencesScreen onBack={()=>setStep(STEP.WELCOME)}/>}
          {step===STEP.PDF && <PDFReport data={data} history={history} onBack={()=>setStep(STEP.RESULT)}/>}
        </>
        )}
      </div>
    </div>
  );
}
