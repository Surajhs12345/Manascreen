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
const SAVE_EXPIRY_H = 24;

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
    {name:"GAD-7",full:"Generalized Anxiety Disorder 7-item scale",cite:"Spitzer RL, Kroenke K, Williams JB, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092-7.",use:"Anxiety severity screening. Used worldwide in primary care."},
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
const ALL_EXERCISES=[
  {id:"box",icon:"🫁",title:"Box Breathing",subtitle:"Calm your nervous system in 4 minutes",color:C.sky,bg:C.skyLight,why:"Box breathing activates your parasympathetic nervous system — 'rest and relax' mode — within minutes.",type:"breath",steps:[{label:"Breathe In",duration:4,instruction:"Slowly breathe in through your nose",color:C.sky},{label:"Hold",duration:4,instruction:"Hold gently",color:C.lavender},{label:"Breathe Out",duration:4,instruction:"Slowly breathe out",color:C.sage},{label:"Hold",duration:4,instruction:"Hold the empty breath",color:C.amber}],rounds:4},
  {id:"478",icon:"🌬️",title:"4-7-8 Breathing",subtitle:"A natural tranquiliser",color:C.lavender,bg:C.lavenderLight,why:"The extended exhale triggers relaxation — especially useful before sleep or during panic.",type:"breath",steps:[{label:"Breathe In",duration:4,instruction:"Inhale through your nose",color:C.sky},{label:"Hold",duration:7,instruction:"Hold completely still",color:C.lavender},{label:"Breathe Out",duration:8,instruction:"Exhale fully through your mouth",color:C.sage}],rounds:4},
  {id:"ground",icon:"🌿",title:"5-4-3-2-1 Grounding",subtitle:"Anchor yourself to the present",color:C.sage,bg:C.sageLight,why:"Grounds you in the present through your senses, interrupting anxious thought spirals.",type:"simple",instructions:["Name 5 things you can SEE right now","Touch 4 things — notice how they feel","Listen for 3 sounds in your environment","Notice 2 things you can smell","Notice 1 thing you can taste"]},
  {id:"comp",icon:"💛",title:"Self-Compassion Pause",subtitle:"Speak to yourself kindly",color:C.peach,bg:C.peachLight,why:"Reduces the harsh inner criticism that depression amplifies.",type:"simple",instructions:["Place a hand on your heart and take a slow breath","Say: 'This is a moment of suffering'","Say: 'Suffering is part of being human — I am not alone'","Say: 'May I be kind to myself in this moment'","Rest here for 60 seconds"]},
];

function ExercisesScreen({onDone}){
  const [active,setActive]=useState(null);
  if(active){
    const ex=ALL_EXERCISES.find(e=>e.id===active);
    return(<div><BackBar onBack={()=>setActive(null)} label="Back to exercises"/><Fade><div style={{marginBottom:20}}><div style={{fontSize:44,marginBottom:8}}>{ex.icon}</div><h2 style={{fontFamily:FD,fontSize:24,color:C.text,marginBottom:6}}>{ex.title}</h2><div style={{background:ex.bg,border:`1.5px solid ${ex.color}33`,borderRadius:14,padding:"14px 16px",marginBottom:20}}><div style={{color:ex.color,fontWeight:800,fontSize:13,marginBottom:4}}>💡 Why this helps</div><p style={{color:C.textMid,fontSize:14,lineHeight:1.7}}>{ex.why}</p></div></div>{ex.type==="breath"?<BreathingExercise exercise={ex} onDone={()=>setActive(null)}/>:<SimpleExercise exercise={ex} onDone={()=>setActive(null)}/>}</Fade></div>);
  }
  return(<div><BackBar onBack={onDone} label="Back to results"/><Fade><div style={{textAlign:"center",marginBottom:24}}><div style={{fontSize:48,marginBottom:10}}>🌿</div><Pill color={C.sage}>Calming Exercises</Pill><h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>Try an exercise</h2><p style={{color:C.textMid,fontSize:14,lineHeight:1.7}}>Evidence-based tools to help you feel better right now.</p></div></Fade><div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>{ALL_EXERCISES.map((ex,i)=><Fade key={ex.id} delay={i*80}><button onClick={()=>setActive(ex.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"16px 18px",background:C.card,border:`1.5px solid ${C.border}`,borderRadius:18,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s"}}><div style={{width:48,height:48,borderRadius:14,background:ex.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{ex.icon}</div><div style={{flex:1}}><div style={{color:C.text,fontWeight:800,fontSize:14,marginBottom:2}}>{ex.title}</div><div style={{color:C.textSoft,fontSize:12}}>{ex.subtitle}</div></div><span style={{color:C.textMuted,fontSize:20}}>›</span></button></Fade>)}</div></div>);
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
function ResultScreen({data,history,onExercises,onFAQ,onLearn,onPDF,onRetake}){
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
  const [showClinical,setShowClinical]=useState(false);
  const clinical=buildClinicalImpression(data);

  return(
    <div>
      <Fade>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:48,marginBottom:10}}>{allGood?"🌸":isCrisis?"💙":"🌿"}</div>
          <Pill color={C.peach}>Your Summary</Pill>
          <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>{allGood?"You seem to be doing well":isCrisis?"Thank you for your honesty":"Here's your assessment"}</h2>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.75}}>{allGood?"Your responses suggest low levels of depression and anxiety.":"These results are a starting point — not a final label."}</p>
          {chronicDuration&&<div style={{marginTop:10,background:C.amberLight,border:`1px solid ${C.amber}44`,borderRadius:10,padding:"8px 14px",fontSize:13,color:C.amber,fontWeight:700}}>⏱️ {duration.duration==="chronic"?"3–12 months":"Over 1 year"} — chronic presentation</div>}
        </div>
      </Fade>

      {isCrisis&&(
        <Fade delay={80}>
          <div style={{background:C.roseLight,border:`2px solid ${C.rose}`,borderRadius:22,padding:"20px",marginBottom:16}}>
            <p style={{color:C.rose,fontWeight:800,fontSize:15,marginBottom:6}}>💙 We noticed you're going through something really hard</p>
            <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:12}}>You matter, and help is right here. Please reach out today — you don't have to carry this alone.</p>
            <div style={{color:C.text,fontSize:13,fontWeight:700,lineHeight:2.1}}>
              📞 <a href="tel:9152987821" style={{color:C.rose}}>iCall: 9152987821</a><br/>
              📞 <a href="tel:18602662345" style={{color:C.rose}}>Vandrevala (24/7): 1860-2662-345</a><br/>
              📞 <a href="tel:08046110007" style={{color:C.rose}}>NIMHANS: 080-46110007</a>
            </div>
          </div>
        </Fade>
      )}

      {/* Core scores */}
      <Fade delay={160}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[{label:"Depression",code:"PHQ-9",score:phq9,max:27,level:dep},{label:"Anxiety",code:"GAD-7",score:gad7,max:21,level:anx}].map(({label,code,score,max,level})=>(
            <Card key={code} style={{textAlign:"center",background:level.color+"0e",border:`1.5px solid ${level.color}44`,padding:"16px 14px"}}>
              <div style={{fontSize:24,marginBottom:2}}>{level.icon}</div>
              <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1}}>{label}</div>
              <div style={{color:level.color,fontWeight:800,fontSize:18,margin:"2px 0"}}>{score}<span style={{fontSize:11,color:C.textMuted}}>/{max}</span></div>
              <div style={{background:level.color+"22",color:level.color,fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:20,display:"inline-block"}}>{level.label}</div>
            </Card>
          ))}
        </div>
      </Fade>

      {/* Trend chart if multiple assessments */}
      {history&&history.length>=2 && <Fade delay={200}><ScoreTrendChart history={history}/></Fade>}

      {/* Domain breakdown */}
      <Fade delay={240}>
        <DomainBreakdown answers={phq9answers} scale="PHQ-9"/>
      </Fade>

      {/* Normalisation */}
      {!allGood && <Fade delay={280}><ComparisonCard phq9={phq9} gad7={gad7}/></Fade>}

      {/* Actionable next step */}
      <Fade delay={320}>
        <Card style={{marginBottom:14,background:nextStep.urgency==="urgent"?C.roseLight:nextStep.urgency==="high"?C.peachLight:nextStep.urgency==="moderate"?C.amberLight:C.sageLight,border:`2px solid ${nextStep.urgency==="urgent"?C.rose:nextStep.urgency==="high"?C.peach:nextStep.urgency==="moderate"?C.amber:C.sage}`}}>
          <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>🎯 Your one next step</div>
          <p style={{color:C.text,fontWeight:800,fontSize:17,fontFamily:FD,lineHeight:1.45,marginBottom:8}}>{nextStep.action}</p>
          <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}>{nextStep.why}</p>
        </Card>
      </Fade>

      {/* Clinical flags */}
      {(hasBipolarFlag||hasPTSD||hasPsychosis||poorSleep||highSomatic||functionalAvg>=6)&&(
        <Fade delay={360}>
          <Card style={{marginBottom:14}}>
            <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:12}}>⚠️ Additional clinical flags</div>
            {hasBipolarFlag&&<FlagRow icon="🌓" color={C.lavender} title="Possible bipolar spectrum" text="Your MDQ responses suggest possible bipolar spectrum symptoms. Please discuss specifically with your psychiatrist — this affects treatment choice."/>}
            {hasPTSD&&<FlagRow icon="🌪️" color={C.rose} title="Possible PTSD" text="Your trauma screen suggests possible PTSD symptoms. Trauma-focused therapy (EMDR, Prolonged Exposure) is highly effective."/>}
            {hasPsychosis&&<FlagRow icon="🧠" color={C.teal} title="Perceptual experiences noted" text="You reported some unusual perceptual experiences. These can have many causes. Please discuss with a psychiatrist."/>}
            {poorSleep&&<FlagRow icon="😴" color={C.indigo} title="Poor sleep quality" text="Addressing sleep often significantly improves mood and anxiety."/>}
            {highSomatic&&<FlagRow icon="🫄" color={C.amber} title="Significant physical symptoms" text="These may be related to your mental health. Very common in Indian presentations of depression."/>}
            {functionalAvg>=6&&<FlagRow icon="💼" color={C.peach} title="Significant functional impairment" text={`Average impact: ${functionalAvg}/10. This level supports prioritising professional help.`}/>}
          </Card>
        </Fade>
      )}

      {/* Treatment intensity tier */}
      <Fade delay={340}>
        <Card style={{marginBottom:14,background:clinical.tier.color+"10",border:`2px solid ${clinical.tier.color}66`}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:22}}>{clinical.tier.icon}</span>
            <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2}}>Recommended care pathway</div>
          </div>
          <p style={{color:clinical.tier.color,fontWeight:800,fontSize:17,fontFamily:FD,marginBottom:10}}>Tier {clinical.tier.level} · {clinical.tier.label}</p>
          <div style={{fontSize:13,color:C.textMid,lineHeight:1.7}}>
            <div style={{marginBottom:4}}><strong>What:</strong> {clinical.tierDetail.action}</div>
            <div style={{marginBottom:4}}><strong>Where:</strong> {clinical.tierDetail.path}</div>
            <div><strong>Typical approach:</strong> {clinical.tierDetail.modality}</div>
          </div>
        </Card>
      </Fade>

      {/* Medication flags */}
      {clinical.medFlags.length>0 && (
        <Fade delay={370}>
          <Card style={{marginBottom:14,background:C.tealLight,border:`2px solid ${C.teal}55`}}>
            <div style={{color:C.teal,fontSize:13,fontWeight:800,marginBottom:10}}>💊 Medication interaction notes</div>
            <p style={{color:C.textMid,fontSize:12,lineHeight:1.65,marginBottom:10,fontStyle:"italic"}}>Some of your medications can affect mood. Share these with your doctor — <strong>do not stop any medication without medical advice.</strong></p>
            {clinical.medFlags.map((m,i)=>(
              <div key={i} style={{padding:"10px 0",borderBottom:i<clinical.medFlags.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{fontWeight:800,fontSize:13,color:m.severity==="high"?C.rose:C.amber,marginBottom:3}}>
                  {m.severity==="high"?"⚠️":"💛"} {m.label}
                </div>
                {m.note && <div style={{color:C.textMid,fontSize:12,lineHeight:1.55}}>{m.note}</div>}
              </div>
            ))}
          </Card>
        </Fade>
      )}

      {/* Clinical impression toggle (for doctor or curious patient) */}
      <Fade delay={400}>
        <button onClick={()=>setShowClinical(s=>!s)} style={{width:"100%",padding:"14px 18px",background:C.indigoLight,border:`1.5px solid ${C.indigo}44`,borderRadius:16,cursor:"pointer",fontFamily:FB,display:"flex",alignItems:"center",gap:10,marginBottom:showClinical?10:14}}>
          <span style={{fontSize:20}}>🩺</span>
          <div style={{flex:1,textAlign:"left"}}>
            <div style={{color:C.indigo,fontWeight:800,fontSize:13}}>Clinical impression (for your doctor)</div>
            <div style={{color:C.textSoft,fontSize:11}}>ICD-11, DSM-5, differentials — tap to {showClinical?"hide":"view"}</div>
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
      </Fade>

      <Fade delay={440}>
        <div style={{background:C.amberLight,border:`1px solid ${C.amber}33`,borderRadius:14,padding:"12px 14px",marginBottom:18}}>
          <p style={{color:C.textMid,fontSize:12,lineHeight:1.65}}>⚠️ <strong>Reminder:</strong> This is a screening aid, not a clinical diagnosis. Always discuss results with a qualified professional.</p>
        </div>
      </Fade>

      <Fade delay={440}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button onClick={onPDF} style={{width:"100%",padding:"18px 20px",borderRadius:20,border:`2px solid ${C.indigo}`,background:`linear-gradient(135deg,${C.indigoLight} 0%,#eff1fc 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:46,height:46,borderRadius:14,background:C.indigo,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📄</div>
            <div style={{flex:1}}><div style={{color:C.indigo,fontWeight:800,fontSize:15,marginBottom:1}}>Download / share clinical report</div><div style={{color:C.textMid,fontSize:12}}>Send to your doctor before your visit</div></div>
            <span style={{color:C.indigo,fontSize:22}}>›</span>
          </button>
          <button onClick={onExercises} style={{width:"100%",padding:"18px 20px",borderRadius:20,border:`2px solid ${C.sage}`,background:`linear-gradient(135deg,${C.sageLight} 0%,#f0faf4 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:46,height:46,borderRadius:14,background:C.sage,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>🌿</div>
            <div style={{flex:1}}><div style={{color:C.sage,fontWeight:800,fontSize:15,marginBottom:1}}>Try a calming exercise</div><div style={{color:C.textMid,fontSize:12}}>Breathing, grounding & more</div></div>
            <span style={{color:C.sage,fontSize:22}}>›</span>
          </button>
          <button onClick={onFAQ} style={{width:"100%",padding:"18px 20px",borderRadius:20,border:`2px solid ${C.sky}`,background:`linear-gradient(135deg,${C.skyLight} 0%,#f0f6ff 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:14}}>
            <div style={{width:46,height:46,borderRadius:14,background:C.sky,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>💬</div>
            <div style={{flex:1}}><div style={{color:C.sky,fontWeight:800,fontSize:15,marginBottom:1}}>Common questions</div><div style={{color:C.textMid,fontSize:12}}>Personalised to your results</div></div>
            <span style={{color:C.sky,fontSize:22}}>›</span>
          </button>
          <WarmButton onClick={onLearn} variant="secondary">📚 Learn about mental health</WarmButton>
          <WarmButton onClick={onRetake} variant="ghost">↩ Start over (saves current as history)</WarmButton>
        </div>
      </Fade>
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

/* ─── Quick Check (PHQ-2 + GAD-2) ───────────────────────────────── */
const PHQ2 = [PHQ9[0], PHQ9[1]]; // first 2 PHQ-9 items
const GAD2 = [GAD7[0], GAD7[1]]; // first 2 GAD-7 items

function QuickCheckScreen({onComplete,onBack,onGoFull}){
  const [phase,setPhase]=useState("intro");
  const [phq2Answers,setPhq2Answers]=useState([]);
  const [gad2Answers,setGad2Answers]=useState([]);
  const [done,setDone]=useState(false);

  if(phase==="intro")return(
    <div>
      <BackBar onBack={onBack}/>
      <Fade>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:52,marginBottom:10}}>⚡</div>
          <Pill color={C.teal}>Quick Check</Pill>
          <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>Just 4 questions, 90 seconds</h2>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.75}}>A brief check using PHQ-2 and GAD-2 — the ultra-short validated versions of the full screens.</p>
        </div>
        <Card style={{marginBottom:14,background:C.tealLight,border:`1.5px solid ${C.teal}44`}}>
          <p style={{color:C.teal,fontSize:13,fontWeight:700,lineHeight:1.6,marginBottom:6}}>🌿 If anything stands out, you can go deeper</p>
          <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}>If your quick check suggests something worth exploring, you'll have the option to do the full 15-minute assessment for a detailed picture.</p>
        </Card>
        <WarmButton onClick={()=>setPhase("phq2")} variant="teal">Start quick check →</WarmButton>
        <button onClick={onGoFull} style={{display:"block",margin:"14px auto 0",background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:13,fontFamily:FB,textDecoration:"underline"}}>Or skip to the full 15-min assessment</button>
      </Fade>
    </div>
  );

  if(phase==="phq2")return(
    <LikertScreen key="quick-phq2" questions={PHQ2} code="PHQ-2" color={C.sky} bgColor={C.skyLight} sectionTitle="Mood (brief)" options={FREQ4}
      onBack={()=>setPhase("intro")} allowSkip={false}
      onComplete={(score,answers)=>{setPhq2Answers(answers);setPhase("gad2");}}/>
  );

  if(phase==="gad2")return(
    <LikertScreen key="quick-gad2" questions={GAD2} code="GAD-2" color={C.sage} bgColor={C.sageLight} sectionTitle="Worry (brief)" options={FREQ4}
      onBack={()=>setPhase("phq2")} allowSkip={false}
      onComplete={(score,answers)=>{
        setGad2Answers(answers);
        const phq2=phq2Answers.reduce((a,b)=>a+(b==="skip"?0:b),0);
        const gad2=score;
        onComplete({phq2,gad2,phq2Answers,gad2Answers:answers});
      }}/>
  );
  return null;
}

function QuickCheckResult({phq2,gad2,onGoFull,onDone,onHelp}){
  // PHQ-2 ≥3 = positive screen for depression
  // GAD-2 ≥3 = positive screen for anxiety
  const depPositive=phq2>=3;
  const anxPositive=gad2>=3;
  const anyPositive=depPositive||anxPositive;

  return(
    <div>
      <Fade>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:48,marginBottom:10}}>{anyPositive?"🌿":"🌸"}</div>
          <Pill color={C.teal}>Quick check complete</Pill>
          <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>
            {anyPositive?"Worth looking deeper":"Good news"}
          </h2>
        </div>
      </Fade>

      <Fade delay={150}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <Card style={{textAlign:"center",background:depPositive?C.amberLight:C.sageLight,border:`1.5px solid ${depPositive?C.amber:C.sage}44`,padding:"16px 12px"}}>
            <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1}}>PHQ-2 (Mood)</div>
            <div style={{color:depPositive?C.amber:C.sage,fontWeight:800,fontSize:20,margin:"2px 0"}}>{phq2}<span style={{fontSize:11,color:C.textMuted}}>/6</span></div>
            <div style={{fontSize:11,color:depPositive?C.amber:C.sage,fontWeight:700}}>{depPositive?"Positive":"Negative"}</div>
          </Card>
          <Card style={{textAlign:"center",background:anxPositive?C.amberLight:C.sageLight,border:`1.5px solid ${anxPositive?C.amber:C.sage}44`,padding:"16px 12px"}}>
            <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1}}>GAD-2 (Worry)</div>
            <div style={{color:anxPositive?C.amber:C.sage,fontWeight:800,fontSize:20,margin:"2px 0"}}>{gad2}<span style={{fontSize:11,color:C.textMuted}}>/6</span></div>
            <div style={{fontSize:11,color:anxPositive?C.amber:C.sage,fontWeight:700}}>{anxPositive?"Positive":"Negative"}</div>
          </Card>
        </div>
      </Fade>

      <Fade delay={250}>
        <Card style={{marginBottom:16,background:anyPositive?C.amberLight:C.sageLight,border:`1.5px solid ${anyPositive?C.amber:C.sage}44`}}>
          {anyPositive?(
            <>
              <div style={{color:C.amber,fontWeight:800,fontSize:14,marginBottom:8}}>💛 Your brief screen is positive</div>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7,marginBottom:8}}>The PHQ-2 and GAD-2 are designed to be sensitive — they flag anything worth looking into. Your result suggests it's worth doing the full 15-minute assessment to get a complete picture.</p>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>The full assessment will give you detailed scores, clinical flags, a treatment tier, and a shareable report for your doctor.</p>
            </>
          ):(
            <>
              <div style={{color:C.sage,fontWeight:800,fontSize:14,marginBottom:8}}>🌱 No significant flags on the brief screen</div>
              <p style={{color:C.textMid,fontSize:13,lineHeight:1.7}}>You can still do the full assessment if you'd like a detailed picture, or just come back anytime you want to check in.</p>
            </>
          )}
        </Card>
      </Fade>

      <Fade delay={320}>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {anyPositive?(
            <>
              <WarmButton onClick={onGoFull} variant="primary">Do the full assessment →</WarmButton>
              <WarmButton onClick={onDone} variant="secondary">Not today, just finish</WarmButton>
            </>
          ):(
            <>
              <WarmButton onClick={onGoFull} variant="secondary">Do the full assessment anyway</WarmButton>
              <WarmButton onClick={onDone} variant="ghost">Finish here</WarmButton>
            </>
          )}
          <button onClick={onHelp} style={{background:"none",border:"none",color:C.rose,cursor:"pointer",fontSize:13,fontFamily:FB,fontWeight:700,marginTop:6}}>💙 I want to talk to someone now</button>
        </div>
      </Fade>

      <Fade delay={400}>
        <div style={{background:C.amberLight,border:`1px solid ${C.amber}33`,borderRadius:12,padding:"12px 14px",marginTop:16}}>
          <p style={{color:C.textMid,fontSize:12,lineHeight:1.65}}>⚠️ The PHQ-2/GAD-2 are screening tools. A negative result doesn't mean you have no concerns — it just means the brief screen didn't flag anything. Trust how you feel.</p>
        </div>
      </Fade>
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

/* ─── Welcome ────────────────────────────────────────────────────── */
/* ─── Welcome ────────────────────────────────────────────────────── */
function WelcomeScreen({onQuick,onFull,onPrivacy,onRefs}){
  return(
    <div style={{textAlign:"center",paddingTop:20}}>
      <Fade>
        <div style={{fontSize:64,marginBottom:10}}>🌸</div>
        <h1 style={{fontFamily:FD,fontSize:34,fontWeight:700,color:C.text,marginBottom:4}}>ManaScreen</h1>
        <p style={{color:C.textSoft,fontSize:12,letterSpacing:2,textTransform:"uppercase",fontWeight:700,marginBottom:6}}>Mental Wellness Assessment</p>
        <p style={{color:C.textMuted,fontSize:11,marginBottom:22}}>DSM-5 & ICD-11 aligned · Private · Free</p>
      </Fade>
      <Fade delay={150}>
        <Card style={{marginBottom:16,background:C.peachLight,border:`1.5px solid ${C.peach}33`}}>
          <p style={{fontFamily:FD,color:C.textMid,fontSize:15,lineHeight:1.85,fontStyle:"italic"}}>"You've taken the first step just by being here. This is a safe, private space — just for you."</p>
        </Card>
      </Fade>

      <Fade delay={250}>
        <div style={{textAlign:"left",color:C.textSoft,fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:1.2,marginBottom:10}}>How would you like to start?</div>
        <button onClick={onQuick} style={{width:"100%",padding:"18px 20px",borderRadius:20,border:`2px solid ${C.teal}`,background:`linear-gradient(135deg,${C.tealLight} 0%,#f0fafa 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
          <div style={{width:50,height:50,borderRadius:15,background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>⚡</div>
          <div style={{flex:1}}>
            <div style={{color:C.teal,fontWeight:800,fontSize:15,marginBottom:2}}>Quick Check (90 seconds)</div>
            <div style={{color:C.textMid,fontSize:12,lineHeight:1.45}}>4 questions · PHQ-2 + GAD-2 ultra-brief</div>
          </div>
          <span style={{color:C.teal,fontSize:22}}>›</span>
        </button>
        <button onClick={onFull} style={{width:"100%",padding:"18px 20px",borderRadius:20,border:`2px solid ${C.peach}`,background:`linear-gradient(135deg,${C.peachLight} 0%,#fff4ee 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:14,marginBottom:18}}>
          <div style={{width:50,height:50,borderRadius:15,background:C.peach,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>📋</div>
          <div style={{flex:1}}>
            <div style={{color:C.peach,fontWeight:800,fontSize:15,marginBottom:2}}>Full Assessment (10–15 min)</div>
            <div style={{color:C.textMid,fontSize:12,lineHeight:1.45}}>Comprehensive · clinical report for your doctor</div>
          </div>
          <span style={{color:C.peach,fontSize:22}}>›</span>
        </button>
      </Fade>

      <Fade delay={350}>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
          {[
            [C.sage,"🔒","No tracking","No cookies, no analytics, nothing saved"],
            [C.sky,"🏥","Clinically validated","PHQ-9, GAD-7, MDQ, C-SSRS + more"],
            [C.amber,"🌿","Adaptive","Questions adjust to your answers"],
            [C.lavender,"📄","Shareable","PDF report for your doctor"],
          ].map(([col,icon,title,sub])=>(
            <div key={title} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 12px",background:col+"10",borderRadius:10,border:`1px solid ${col}25`}}>
              <span style={{fontSize:18}}>{icon}</span>
              <div style={{textAlign:"left",flex:1}}><div style={{fontWeight:800,color:C.text,fontSize:12}}>{title}</div><div style={{color:C.textSoft,fontSize:11}}>{sub}</div></div>
            </div>
          ))}
        </div>
      </Fade>

      <Fade delay={450}>
        <div style={{background:C.roseLight,border:`1.5px solid ${C.rose}44`,borderRadius:14,padding:"12px 14px",marginBottom:16,textAlign:"left"}}>
          <div style={{color:C.rose,fontWeight:800,fontSize:12,marginBottom:3}}>💙 Need help right now?</div>
          <div style={{color:C.textMid,fontSize:12,lineHeight:1.65}}>Tap the 💙 button anytime. iCall <strong>9152987821</strong> · Vandrevala <strong>1860-2662-345</strong></div>
        </div>
        <div style={{display:"flex",gap:12,justifyContent:"center",fontSize:12}}>
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
  PRIVACY:"privacy", REFS:"refs", PDF:"pdf",
};
const SAVEABLE_STEPS=[STEP.WHO,STEP.PROFILE,STEP.MEDICAL,STEP.MEDS,STEP.DURATION,STEP.PHQ9,STEP.BRIDGE,STEP.GAD7,STEP.TW_PHQ15,STEP.PHQ15,STEP.TW_MDQ,STEP.MDQ,STEP.TW_TRAUMA,STEP.TRAUMA,STEP.SLEEP,STEP.PSYCHOSIS,STEP.FUNCTIONAL];

export default function App(){
  const [step,setStep]=useState(STEP.WELCOME);
  const [who,setWho]=useState("self");
  const [data,setData]=useState({});
  const [history,setHistory]=useState([]);
  const [helpOpen,setHelpOpen]=useState(false);
  const [showResume,setShowResume]=useState(false);
  const [savedState,setSavedState]=useState(null);

  // Load saved progress + history on mount
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
    }catch(e){}
  },[]);

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
          const newHistory=[...history,{when:Date.now(),phq9:data.phq9,gad7:data.gad7}].slice(-10);
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
                {[STEP.RESULT,STEP.EXERCISES,STEP.FAQ,STEP.LEARN,STEP.PDF,STEP.QUICK_RESULT].includes(step)&&<button onClick={reset} style={{background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:12,fontFamily:FB}}>Start over</button>}
              </div>
            </div>
          )}

          {step===STEP.WELCOME && <WelcomeScreen
            onQuick={()=>setStep(STEP.QUICK)}
            onFull={()=>setStep(STEP.WHO)}
            onPrivacy={()=>setStep(STEP.PRIVACY)}
            onRefs={()=>setStep(STEP.REFS)}/>}

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
          {step===STEP.PROFILE && <ProfileScreen initial={data.profile} onComplete={p=>{update("profile",p);setStep(STEP.MEDICAL);}} onBack={()=>setStep(STEP.WHO)}/>}
          {step===STEP.MEDICAL && <MedicalHistoryScreen initial={data.medical} onComplete={m=>{update("medical",m);setStep(m.meds==="Yes"?STEP.MEDS:STEP.DURATION);}} onBack={()=>setStep(STEP.PROFILE)}/>}
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

          {step===STEP.RESULT && <ResultScreen data={data} history={history} onExercises={()=>setStep(STEP.EXERCISES)} onFAQ={()=>setStep(STEP.FAQ)} onLearn={()=>setStep(STEP.LEARN)} onPDF={()=>setStep(STEP.PDF)} onRetake={reset}/>}
          {step===STEP.EXERCISES && <ExercisesScreen onDone={()=>setStep(STEP.RESULT)}/>}
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
