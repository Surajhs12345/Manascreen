import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Design tokens ──────────────────────────────────────────────── */
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

/* ─── Encouragements ─────────────────────────────────────────────── */
const ENCOURAGEMENTS = [
  "Thank you for sharing that 🌿","You're doing really well 💛",
  "That took courage — keep going 🌸","Every answer helps us understand you better ✨",
  "You're not alone in feeling this way 🤝","Almost there — you're doing great 🌼",
  "Thank you for being honest with yourself 💙","This is a brave step you're taking 🌱",
  "You matter, and so do your feelings 🧡",
];

/* ─── Core screening questions ───────────────────────────────────── */
const PHQ9 = [
  {q:"Having little interest or pleasure in doing things you used to enjoy",emoji:"😔"},
  {q:"Feeling down, hopeless, or like things won't get better",emoji:"🌧️"},
  {q:"Trouble falling asleep, staying asleep, or sleeping too much",emoji:"😴"},
  {q:"Feeling tired or having very little energy",emoji:"🪫"},
  {q:"Not feeling hungry, or eating much more than usual",emoji:"🍽️"},
  {q:"Feeling bad about yourself, or like you've let people down",emoji:"💔"},
  {q:"Difficulty focusing on reading, conversations, or daily tasks",emoji:"🌀"},
  {q:"Moving or speaking more slowly than usual — or feeling restless inside",emoji:"🐢"},
  {q:"Having thoughts of hurting yourself or that you'd be better off not here",emoji:"⚠️"},
];
const GAD7 = [
  {q:"Feeling nervous, anxious, or on edge",emoji:"😰"},
  {q:"Not being able to stop or control your worrying",emoji:"🌪️"},
  {q:"Worrying too much about many different things at once",emoji:"💭"},
  {q:"Finding it hard to relax, even when you have time to",emoji:"😤"},
  {q:"Being so restless that it's hard to sit still",emoji:"⚡"},
  {q:"Becoming easily annoyed or irritable with people around you",emoji:"😣"},
  {q:"Feeling afraid — like something awful might happen",emoji:"😨"},
];
const FREQ4 = [
  {label:"Not at all",sub:"Hasn't happened",value:0,color:C.sage},
  {label:"A few days",sub:"Once in a while",value:1,color:C.sky},
  {label:"More than half the days",sub:"Quite often",value:2,color:C.amber},
  {label:"Nearly every day",sub:"Almost always",value:3,color:C.peach},
];

/* ─── PHQ-15 Somatic Symptom Scale ──────────────────────────────── */
const PHQ15 = [
  {q:"Stomach pain",emoji:"🫄"},
  {q:"Back pain",emoji:"🔙"},
  {q:"Pain in your arms, legs, or joints",emoji:"🦴"},
  {q:"Headaches",emoji:"🤕"},
  {q:"Chest pain or shortness of breath",emoji:"🫁"},
  {q:"Dizziness",emoji:"😵"},
  {q:"Feeling your heart pound or race",emoji:"💓"},
  {q:"Feeling tired or having low energy",emoji:"🪫"},
  {q:"Trouble sleeping",emoji:"😴"},
  {q:"Nausea, gas, or indigestion",emoji:"🤢"},
  {q:"Constipation, loose bowels, or diarrhoea",emoji:"🏃"},
  {q:"Pain or problems during sexual intercourse",emoji:"💔"},
  {q:"Feeling faint",emoji:"😶‍🌫️"},
  {q:"Numbness, tingling, or weakness in hands or feet",emoji:"🤲"},
  {q:"During your period, cramps or other problems (women only — skip if not applicable)",emoji:"🌸"},
];
const FREQ3 = [
  {label:"Not bothered at all",value:0,color:C.sage},
  {label:"Bothered a little",value:1,color:C.amber},
  {label:"Bothered a lot",value:2,color:C.peach},
];

/* ─── MDQ — Mood Disorder Questionnaire (Bipolar screen) ────────── */
const MDQ_ITEMS = [
  "You felt so good or so hyper that other people thought you were not your normal self or you were so hyper that you got into trouble",
  "You were so irritable that you shouted at people or started fights or arguments",
  "You felt much more self-confident than usual",
  "You got much less sleep than usual and found you didn't really miss it",
  "You were much more talkative or spoke faster than usual",
  "Thoughts raced through your head or you couldn't slow your mind down",
  "You were so easily distracted by things around you that you had trouble concentrating or staying on task",
  "You had much more energy than usual",
  "You were much more active or did many more things than usual",
  "You were much more social or outgoing than usual — for example, you telephoned friends in the middle of the night",
  "You were much more interested in sex than usual",
  "You did things that were unusual for you or that other people might have thought were excessive, foolish, or risky",
  "Spending money got you or your family into trouble",
];

/* ─── PC-PTSD-5 Trauma Screen ────────────────────────────────────── */
const PCPTSD5 = [
  {q:"Had nightmares about a traumatic event or thought about it when you didn't want to",emoji:"😰"},
  {q:"Tried hard not to think about a traumatic event or went out of your way to avoid situations that reminded you of it",emoji:"🚫"},
  {q:"Been constantly on guard, watchful, or easily startled",emoji:"⚡"},
  {q:"Felt numb or detached from people, activities, or your surroundings",emoji:"😶"},
  {q:"Felt guilty or unable to stop blaming yourself or others for a traumatic event",emoji:"💔"},
];

/* ─── PSQI Brief — Sleep screen ──────────────────────────────────── */
const SLEEP_Qs = [
  {q:"How long does it usually take you to fall asleep?",emoji:"🌙",type:"choice",options:[{label:"Under 15 minutes",value:0},{label:"16–30 minutes",value:1},{label:"31–60 minutes",value:2},{label:"Over 60 minutes",value:3}]},
  {q:"How many hours of sleep do you actually get each night?",emoji:"⏰",type:"choice",options:[{label:"More than 7 hours",value:0},{label:"6–7 hours",value:1},{label:"5–6 hours",value:2},{label:"Less than 5 hours",value:3}]},
  {q:"How often do you wake up during the night and can't get back to sleep?",emoji:"😴",type:"choice",options:[{label:"Not in the past month",value:0},{label:"Less than once a week",value:1},{label:"Once or twice a week",value:2},{label:"Three or more times a week",value:3}]},
  {q:"How would you rate your overall sleep quality?",emoji:"⭐",type:"choice",options:[{label:"Very good",value:0},{label:"Fairly good",value:1},{label:"Fairly bad",value:2},{label:"Very bad",value:3}]},
];

/* ─── C-SSRS Brief — Suicide Risk ───────────────────────────────── */
const CSSRS = [
  {q:"Have you wished you were dead or wished you could go to sleep and not wake up?",level:1,emoji:"😶‍🌫️"},
  {q:"Have you had any actual thoughts of killing yourself?",level:2,emoji:"⚠️"},
  {q:"Have you been thinking about how you might do this?",level:3,emoji:"🚨"},
  {q:"Have you had any intention of acting on these thoughts?",level:4,emoji:"🆘"},
  {q:"Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?",level:5,emoji:"🆘"},
];

/* ─── Psychosis Screen ───────────────────────────────────────────── */
const PSYCHOSIS_Qs = [
  {q:"Have you ever heard voices or sounds that other people couldn't hear, or seen things that other people couldn't see?",emoji:"👂"},
  {q:"Have you ever felt that people were watching you, talking about you, or trying to harm you — without a clear reason?",emoji:"👁️"},
];

/* ─── Shared UI components ───────────────────────────────────────── */
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
  }[variant]||{bg:C.peach,fg:C.white,br:C.peach};
  return <button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"17px 24px",borderRadius:18,border:`2px solid ${disabled?C.border:v.br}`,background:disabled?C.border:v.bg,color:disabled?C.textMuted:v.fg,fontSize:16,fontWeight:800,cursor:disabled?"not-allowed":"pointer",fontFamily:FB,transition:"all 0.2s ease",boxShadow:disabled?"none":"0 3px 14px rgba(0,0,0,0.08)",...style}}>{children}</button>;
}
function BgDecor(){
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
    <div style={{position:"absolute",top:-120,right:-80,width:340,height:340,borderRadius:"50%",background:"radial-gradient(circle,#fdeee688 0%,transparent 70%)"}}/>
    <div style={{position:"absolute",bottom:-100,left:-60,width:280,height:280,borderRadius:"50%",background:"radial-gradient(circle,#e8f4ed88 0%,transparent 70%)"}}/>
    <div style={{position:"absolute",top:"40%",left:-40,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,#e8f0fa66 0%,transparent 70%)"}}/>
  </div>;
}

/* ─── Generic Likert question screen ────────────────────────────── */
function LikertScreen({questions,code,color,bgColor,sectionTitle,options,stepLabel,onComplete}){
  const [current,setCurrent]=useState(0);
  const [answers,setAnswers]=useState([]);
  const [selected,setSelected]=useState(null);
  const [encourageMsg,setEncourageMsg]=useState("");
  const [showEncourage,setShowEncourage]=useState(false);
  const [visible,setVisible]=useState(true);
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
        if(current+1<questions.length){setAnswers(na);setCurrent(c=>c+1);setSelected(null);setVisible(true);}
        else onComplete(na.reduce((a,b)=>a+b,0),na);
      },300);
    },900);
  };

  const q=questions[current];
  return(
    <div>
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
            <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}>Please answer honestly. If you're struggling right now, help is a call away — iCall: <strong>9152987821</strong></p>
          </div>
        </Fade>
      )}
      <div style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(10px)",transition:"opacity 0.35s ease,transform 0.35s ease"}}>
        <Card style={{marginBottom:22,background:bgColor,border:`1.5px solid ${color}33`,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:10}}>{q.emoji}</div>
          <p style={{color:C.textSoft,fontSize:13,marginBottom:10}}>Over the <strong>last 2 weeks</strong>, how often have you been experiencing…</p>
          <p style={{fontFamily:FD,color:C.text,fontSize:18,lineHeight:1.65,fontWeight:600}}>{q.q}</p>
        </Card>
      </div>
      <div style={{textAlign:"center",height:30,marginBottom:14,opacity:showEncourage?1:0,transform:showEncourage?"translateY(0)":"translateY(-6px)",transition:"all 0.35s ease"}}>
        <span style={{color:C.sage,fontWeight:800,fontSize:15}}>{encourageMsg}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {options.map(ch=>(
          <button key={ch.value} onClick={()=>handleChoice(ch.value)} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderRadius:16,border:`2px solid ${selected===ch.value?ch.color||color:C.border}`,background:selected===ch.value?(ch.color||color)+"1a":C.card,cursor:selected!==null?"default":"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.18s ease",opacity:selected!==null&&selected!==ch.value?0.4:1,boxShadow:selected===ch.value?`0 0 0 3px ${ch.color||color}33`:"none"}}
            onMouseEnter={e=>{if(selected===null){e.currentTarget.style.borderColor=ch.color||color;e.currentTarget.style.background=(ch.color||color)+"11";}}}
            onMouseLeave={e=>{if(selected!==ch.value){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}}>
            <div style={{width:38,height:38,borderRadius:11,background:(ch.color||color)+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:ch.color||color,fontWeight:800,fontSize:14}}>{ch.value}</span></div>
            <div><div style={{color:C.text,fontWeight:700,fontSize:15}}>{ch.label}</div>{ch.sub&&<div style={{color:C.textSoft,fontSize:12,marginTop:2}}>{ch.sub}</div>}</div>
            {selected===ch.value&&<span style={{marginLeft:"auto",color:ch.color||color,fontSize:20}}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Age & profile intake ───────────────────────────────────────── */
function ProfileScreen({onComplete}){
  const [age,setAge]=useState("");
  const [gender,setGender]=useState("");
  const [ageGroup,setAgeGroup]=useState("");
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
      <Fade>
        <Pill color={C.sky}>About You</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>A few quick details</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:24}}>This helps us tailor the assessment and interpret your results more accurately. Nothing is stored or shared.</p>
      </Fade>
      <Fade delay={150}>
        <div style={{marginBottom:22}}>
          <div style={{color:C.textSoft,fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>Age group</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {ageGroups.map(a=>(
              <button key={a.val} onClick={()=>setAgeGroup(a.val)} style={{padding:"10px 16px",borderRadius:14,border:`2px solid ${ageGroup===a.val?C.sky:C.border}`,background:ageGroup===a.val?C.skyLight:C.card,color:C.text,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FB,transition:"all 0.15s",display:"flex",alignItems:"center",gap:6}}>
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
              <button key={g.val} onClick={()=>setGender(g.val)} style={{padding:"14px 18px",borderRadius:14,border:`2px solid ${gender===g.val?C.peach:C.border}`,background:gender===g.val?C.peachLight:C.card,color:C.text,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FB,transition:"all 0.15s",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
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

/* ─── Medical history screen ─────────────────────────────────────── */
function MedicalHistoryScreen({onComplete}){
  const [answers,setAnswers]=useState({});
  const questions=[
    {id:"thyroid",q:"Do you have a known thyroid condition (hypothyroid or hyperthyroid)?",icon:"🦋",note:"Thyroid disorders can cause depression and anxiety symptoms"},
    {id:"meds",q:"Are you currently taking any regular medications?",icon:"💊",note:"Some medications can affect mood and mental health"},
    {id:"substances",q:"Do you use alcohol, tobacco, or any other substances regularly?",icon:"🍷",note:"Substance use can both cause and worsen mental health symptoms"},
    {id:"chronic",q:"Do you have any chronic physical health condition (diabetes, heart disease, chronic pain, etc.)?",icon:"🏥",note:"Chronic illness is a major risk factor for depression"},
    {id:"head",q:"Have you ever had a significant head injury, neurological condition, or seizures?",icon:"🧠",note:"These can affect mood and behaviour"},
    {id:"family",q:"Does anyone in your immediate family (parent, sibling) have a history of depression, anxiety, or bipolar disorder?",icon:"👨‍👩‍👧",note:"Family history significantly increases risk"},
  ];
  const toggle=(id,val)=>setAnswers(a=>({...a,[id]:val}));
  const allAnswered=questions.every(q=>answers[q.id]!==undefined);

  return(
    <div>
      <Fade>
        <Pill color={C.teal}>Medical Background</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>A few medical questions</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:22}}>Medical factors can significantly affect mental health. These questions help us give you more accurate guidance. All answers are private.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        {questions.map((q,i)=>(
          <Fade key={q.id} delay={i*60}>
            <Card style={{padding:"18px 20px"}}>
              <div style={{display:"flex",gap:12,marginBottom:10}}>
                <span style={{fontSize:24,flexShrink:0}}>{q.icon}</span>
                <div>
                  <p style={{color:C.text,fontWeight:700,fontSize:14,lineHeight:1.6,marginBottom:4}}>{q.q}</p>
                  <p style={{color:C.textMuted,fontSize:12,fontStyle:"italic"}}>{q.note}</p>
                </div>
              </div>
              <div style={{display:"flex",gap:10}}>
                {["Yes","No","Not sure"].map(opt=>(
                  <button key={opt} onClick={()=>toggle(q.id,opt)} style={{flex:1,padding:"10px",borderRadius:12,border:`2px solid ${answers[q.id]===opt?C.teal:C.border}`,background:answers[q.id]===opt?C.tealLight:C.card,color:answers[q.id]===opt?C.teal:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:FB,transition:"all 0.15s"}}>
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
function DurationScreen({onComplete}){
  const [duration,setDuration]=useState("");
  const [onset,setOnset]=useState("");
  const durations=[
    {label:"Less than 2 weeks",val:"acute",icon:"🌱",note:"Acute — may be situational"},
    {label:"2–4 weeks",val:"subacute",icon:"🌿",note:"Sub-acute — warrants monitoring"},
    {label:"1–3 months",val:"moderate",icon:"🌳",note:"Moderate duration"},
    {label:"3–12 months",val:"chronic",icon:"🍂",note:"Chronic — professional help advised"},
    {label:"Over a year",val:"longterm",icon:"🌾",note:"Long-term — professional help strongly advised"},
  ];
  const onsets=[
    {label:"Gradually over time",val:"gradual",icon:"🌊"},
    {label:"After a specific event",val:"event",icon:"⚡"},
    {label:"No clear reason",val:"unclear",icon:"❓"},
    {label:"I'm not sure",val:"unsure",icon:"🤷"},
  ];

  return(
    <div>
      <Fade>
        <Pill color={C.amber}>Duration & Onset</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>How long have you been feeling this way?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:22}}>Duration helps distinguish between acute reactions and chronic conditions — which affects the guidance we give you.</p>
      </Fade>
      <Fade delay={100}>
        <div style={{marginBottom:22}}>
          <div style={{color:C.textSoft,fontSize:13,fontWeight:800,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>How long?</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {durations.map(d=>(
              <button key={d.val} onClick={()=>setDuration(d.val)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",borderRadius:16,border:`2px solid ${duration===d.val?C.amber:C.border}`,background:duration===d.val?C.amberLight:C.card,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.15s"}}>
                <span style={{fontSize:24}}>{d.icon}</span>
                <div style={{flex:1}}>
                  <div style={{color:C.text,fontWeight:700,fontSize:14}}>{d.label}</div>
                  <div style={{color:C.textSoft,fontSize:12}}>{d.note}</div>
                </div>
                {duration===d.val&&<span style={{color:C.amber,fontSize:18}}>✓</span>}
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
              <button key={o.val} onClick={()=>setOnset(o.val)} style={{padding:"14px 12px",borderRadius:14,border:`2px solid ${onset===o.val?C.amber:C.border}`,background:onset===o.val?C.amberLight:C.card,cursor:"pointer",fontFamily:FB,transition:"all 0.15s",textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:4}}>{o.icon}</div>
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

/* ─── Functional Impairment Scale ────────────────────────────────── */
function FunctionalScreen({onComplete}){
  const [scores,setScores]=useState({work:null,relationships:null,selfcare:null});
  const domains=[
    {id:"work",label:"Work / Studies / Daily tasks",icon:"💼",color:C.sky},
    {id:"relationships",label:"Relationships & social life",icon:"🤝",color:C.sage},
    {id:"selfcare",label:"Looking after yourself (eating, sleeping, hygiene)",icon:"🌿",color:C.peach},
  ];
  const allDone=Object.values(scores).every(v=>v!==null);

  return(
    <div>
      <Fade>
        <Pill color={C.indigo}>Functional Impact</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>How much are these feelings affecting your life?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:8}}>Rate each area from 0 (no impact) to 10 (completely unable to function). This is a core part of the DSM-5 assessment.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:18,marginBottom:28}}>
        {domains.map((d,i)=>(
          <Fade key={d.id} delay={i*100}>
            <Card>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <span style={{fontSize:24}}>{d.icon}</span>
                <span style={{color:C.text,fontWeight:700,fontSize:15}}>{d.label}</span>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[0,1,2,3,4,5,6,7,8,9,10].map(n=>{
                  const intensity=n<=3?C.sage:n<=6?C.amber:C.rose;
                  return(
                    <button key={n} onClick={()=>setScores(s=>({...s,[d.id]:n}))} style={{width:36,height:36,borderRadius:10,border:`2px solid ${scores[d.id]===n?intensity:C.border}`,background:scores[d.id]===n?intensity:C.card,color:scores[d.id]===n?C.white:C.textMid,fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:FB,transition:"all 0.15s"}}>
                      {n}
                    </button>
                  );
                })}
              </div>
              {scores[d.id]!==null&&(
                <div style={{marginTop:10,fontSize:13,color:C.textSoft}}>
                  {scores[d.id]<=3?"Mild impact — manageable":scores[d.id]<=6?"Moderate impact — affecting daily life":"Significant impact — needs attention"}
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

/* ─── MDQ Bipolar Screen ─────────────────────────────────────────── */
function MDQScreen({onComplete}){
  const [answers,setAnswers]=useState({});
  const [phase,setPhase]=useState("items"); // items | cluster | impact
  const [cluster,setCluster]=useState(null);
  const [impact,setImpact]=useState(null);
  const yesCount=Object.values(answers).filter(v=>v==="yes").length;

  if(phase==="items") return(
    <div>
      <Fade>
        <Pill color={C.lavender}>Mood Episode Screen</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 8px"}}>Have you ever experienced a period of unusually high or irritable mood?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:8}}>Think of a time — even years ago — when you felt very different from usual. Answer Yes or No for each.</p>
        <div style={{background:C.lavenderLight,border:`1.5px solid ${C.lavender}44`,borderRadius:14,padding:"12px 16px",marginBottom:20}}>
          <p style={{color:C.lavender,fontSize:13,fontWeight:700}}>💜 Why this matters: Some people experience episodes of very high or irritable mood (mania/hypomania) that can be missed. This screen helps us check for bipolar spectrum conditions.</p>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:22}}>
        {MDQ_ITEMS.map((item,i)=>(
          <Fade key={i} delay={i*40}>
            <Card style={{padding:"16px 18px"}}>
              <p style={{color:C.text,fontSize:14,lineHeight:1.65,marginBottom:12}}>{i+1}. {item}</p>
              <div style={{display:"flex",gap:10}}>
                {["Yes","No"].map(opt=>(
                  <button key={opt} onClick={()=>setAnswers(a=>({...a,[i]:opt.toLowerCase()}))} style={{flex:1,padding:"10px",borderRadius:12,border:`2px solid ${answers[i]===opt.toLowerCase()?C.lavender:C.border}`,background:answers[i]===opt.toLowerCase()?C.lavenderLight:C.card,color:answers[i]===opt.toLowerCase()?C.lavender:C.textMid,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:FB,transition:"all 0.15s"}}>
                    {opt}
                  </button>
                ))}
              </div>
            </Card>
          </Fade>
        ))}
      </div>
      <WarmButton onClick={()=>setPhase("cluster")} disabled={Object.keys(answers).length<MDQ_ITEMS.length} style={{background:C.lavender,borderColor:C.lavender}}>
        Next →
      </WarmButton>
    </div>
  );

  if(phase==="cluster") return(
    <div>
      <Fade>
        <Pill color={C.lavender}>Mood Episode Screen</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 12px"}}>Did several of these things happen during the same period of time?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:24}}>The key diagnostic question is whether these experiences occurred together — not just separately at different times.</p>
        <div style={{display:"flex",gap:14,marginBottom:24}}>
          {["Yes","No"].map(opt=>(
            <button key={opt} onClick={()=>setCluster(opt.toLowerCase())} style={{flex:1,padding:"20px",borderRadius:18,border:`2px solid ${cluster===opt.toLowerCase()?C.lavender:C.border}`,background:cluster===opt.toLowerCase()?C.lavenderLight:C.card,color:cluster===opt.toLowerCase()?C.lavender:C.textMid,fontWeight:800,fontSize:18,cursor:"pointer",fontFamily:FB,transition:"all 0.15s",textAlign:"center"}}>
              {opt}
            </button>
          ))}
        </div>
        <WarmButton onClick={()=>setPhase("impact")} disabled={!cluster} style={{background:C.lavender,borderColor:C.lavender}}>Next →</WarmButton>
      </Fade>
    </div>
  );

  return(
    <div>
      <Fade>
        <Pill color={C.lavender}>Mood Episode Screen</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 12px"}}>How much of a problem did these mood changes cause?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:24}}>Think about the most difficult episode you experienced.</p>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
          {["No problem","Minor problem","Moderate problem","Serious problem"].map((opt,i)=>(
            <button key={opt} onClick={()=>setImpact(i)} style={{padding:"16px 20px",borderRadius:16,border:`2px solid ${impact===i?C.lavender:C.border}`,background:impact===i?C.lavenderLight:C.card,color:C.text,fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:FB,transition:"all 0.15s",textAlign:"left"}}>
              {opt}
            </button>
          ))}
        </div>
        <WarmButton onClick={()=>onComplete({yesCount,cluster,impact,positive:yesCount>=7&&cluster==="yes"&&impact>=2})} disabled={impact===null} style={{background:C.lavender,borderColor:C.lavender}}>
          Continue →
        </WarmButton>
      </Fade>
    </div>
  );
}

/* ─── PC-PTSD-5 Trauma Screen ────────────────────────────────────── */
function TraumaScreen({onComplete}){
  const [hasTrauma,setHasTrauma]=useState(null);
  const [answers,setAnswers]=useState({});
  const [phase,setPhase]=useState("gate");

  if(phase==="gate") return(
    <div>
      <Fade>
        <Pill color={C.rose}>Trauma Screen</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 8px"}}>Have you ever experienced something very stressful or traumatic?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:16}}>This includes things like an accident, natural disaster, assault, serious illness, the sudden death of someone close, or any experience that felt overwhelming or life-threatening.</p>
        <div style={{background:C.roseLight,border:`1.5px solid ${C.rose}33`,borderRadius:14,padding:"12px 16px",marginBottom:22}}>
          <p style={{color:C.rose,fontSize:13,fontWeight:700}}>🌸 You don't need to share details. We only ask Yes or No.</p>
        </div>
        <div style={{display:"flex",gap:14,marginBottom:24}}>
          {["Yes","No"].map(opt=>(
            <button key={opt} onClick={()=>setHasTrauma(opt.toLowerCase())} style={{flex:1,padding:"20px",borderRadius:18,border:`2px solid ${hasTrauma===opt.toLowerCase()?C.rose:C.border}`,background:hasTrauma===opt.toLowerCase()?C.roseLight:C.card,color:hasTrauma===opt.toLowerCase()?C.rose:C.textMid,fontWeight:800,fontSize:18,cursor:"pointer",fontFamily:FB,transition:"all 0.15s",textAlign:"center"}}>
              {opt}
            </button>
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
      <Fade>
        <Pill color={C.rose}>Trauma Screen (PC-PTSD-5)</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 8px"}}>In the past month, have you…</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:8}}>These questions relate to any difficult or traumatic experience you may have had. Answer Yes or No.</p>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden",marginBottom:20}}>
          <div style={{height:"100%",width:`${(answered/PCPTSD5.length)*100}%`,background:C.rose,borderRadius:3,transition:"width 0.4s"}}/>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:22}}>
        {PCPTSD5.map((item,i)=>(
          <Fade key={i} delay={i*60}>
            <Card style={{padding:"16px 18px",background:answers[i]!==undefined?(answers[i]?"yes"?C.roseLight:C.sageLight:C.sageLight):C.card}}>
              <div style={{display:"flex",gap:10,marginBottom:12}}>
                <span style={{fontSize:22,flexShrink:0}}>{item.emoji}</span>
                <p style={{color:C.text,fontSize:14,lineHeight:1.65}}>{item.q}</p>
              </div>
              <div style={{display:"flex",gap:10}}>
                {["Yes","No"].map(opt=>(
                  <button key={opt} onClick={()=>setAnswers(a=>({...a,[i]:opt==="Yes"}))} style={{flex:1,padding:"10px",borderRadius:12,border:`2px solid ${answers[i]===(opt==="Yes")?opt==="Yes"?C.rose:C.sage:C.border}`,background:answers[i]===(opt==="Yes")?(opt==="Yes"?C.roseLight:C.sageLight):C.card,color:C.textMid,fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:FB,transition:"all 0.15s"}}>
                    {opt}
                  </button>
                ))}
              </div>
            </Card>
          </Fade>
        ))}
      </div>
      <WarmButton onClick={()=>{const score=Object.values(answers).filter(Boolean).length;onComplete({score,positive:score>=3,skipped:false});}} disabled={answered<PCPTSD5.length} variant="rose">
        Continue →
      </WarmButton>
    </div>
  );
}

/* ─── Sleep Screen (PSQI Brief) ──────────────────────────────────── */
function SleepScreen({onComplete}){
  const [answers,setAnswers]=useState({});
  const allDone=Object.keys(answers).length===SLEEP_Qs.length;

  return(
    <div>
      <Fade>
        <Pill color={C.indigo}>Sleep Quality</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"12px 0 8px"}}>How has your sleep been?</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:8}}>Sleep and mental health are deeply connected. Answer based on your sleep over the last month.</p>
        <div style={{background:C.indigoLight,border:`1.5px solid ${C.indigo}44`,borderRadius:14,padding:"12px 16px",marginBottom:22}}>
          <p style={{color:C.indigo,fontSize:13,fontWeight:700}}>🌙 Poor sleep is both a symptom and a cause of depression and anxiety — catching it early matters.</p>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:24}}>
        {SLEEP_Qs.map((q,i)=>(
          <Fade key={i} delay={i*80}>
            <Card>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:14}}>
                <span style={{fontSize:26}}>{q.emoji}</span>
                <p style={{color:C.text,fontWeight:700,fontSize:15,lineHeight:1.55}}>{q.q}</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {q.options.map(opt=>(
                  <button key={opt.value} onClick={()=>setAnswers(a=>({...a,[i]:opt.value}))} style={{padding:"11px 16px",borderRadius:12,border:`2px solid ${answers[i]===opt.value?C.indigo:C.border}`,background:answers[i]===opt.value?C.indigoLight:C.card,color:C.text,fontWeight:600,fontSize:14,cursor:"pointer",fontFamily:FB,transition:"all 0.15s",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
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

/* ─── Psychosis Screen ───────────────────────────────────────────── */
function PsychosisScreen({onComplete}){
  const [answers,setAnswers]=useState({});
  const allDone=Object.keys(answers).length===PSYCHOSIS_Qs.length;

  return(
    <div>
      <Fade>
        <Pill color={C.teal}>Perceptual Experiences</Pill>
        <h2 style={{fontFamily:FD,fontSize:22,color:C.text,margin:"12px 0 8px"}}>A couple of important questions</h2>
        <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:8}}>These questions help us understand the full picture of your mental health. There are no right or wrong answers — please be honest.</p>
        <div style={{background:C.tealLight,border:`1.5px solid ${C.teal}44`,borderRadius:14,padding:"12px 16px",marginBottom:22}}>
          <p style={{color:C.teal,fontSize:13,fontWeight:700}}>🌿 These experiences are more common than people think, and can be related to stress, sleep deprivation, or other treatable conditions.</p>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:24}}>
        {PSYCHOSIS_Qs.map((q,i)=>(
          <Fade key={i} delay={i*100}>
            <Card style={{padding:"18px 20px"}}>
              <div style={{display:"flex",gap:10,marginBottom:14}}>
                <span style={{fontSize:26,flexShrink:0}}>{q.emoji}</span>
                <p style={{color:C.text,fontWeight:700,fontSize:15,lineHeight:1.6}}>{q.q}</p>
              </div>
              <div style={{display:"flex",gap:10}}>
                {["Yes","No","Sometimes"].map(opt=>(
                  <button key={opt} onClick={()=>setAnswers(a=>({...a,[i]:opt}))} style={{flex:1,padding:"10px",borderRadius:12,border:`2px solid ${answers[i]===opt?C.teal:C.border}`,background:answers[i]===opt?C.tealLight:C.card,color:answers[i]===opt?C.teal:C.textMid,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:FB,transition:"all 0.15s"}}>
                    {opt}
                  </button>
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

/* ─── C-SSRS Safety Screen ───────────────────────────────────────── */
function SafetyScreen({onComplete}){
  const [level,setLevel]=useState(0); // 0 = not started, 1-5 = level reached, -1 = denied all
  const [contact,setContact]=useState("");
  const [notifyName,setNotifyName]=useState("");
  const [notifyPhone,setNotifyPhone]=useState("");
  const [phase,setPhase]=useState("screen");

  const handleAnswer=(q,yes)=>{
    if(!yes){
      if(q.level===1) onComplete({level:0,safe:true});
      else onComplete({level:q.level-1,safe:q.level<=2});
      return;
    }
    if(q.level===5||q.level>=3){setLevel(q.level);setPhase("crisis");}
    else setLevel(q.level);
  };

  if(phase==="crisis") return(
    <div>
      <Fade>
        <div style={{background:C.roseLight,border:`2px solid ${C.rose}`,borderRadius:22,padding:"24px",marginBottom:20,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:10}}>💙</div>
          <h2 style={{fontFamily:FD,fontSize:22,color:C.rose,marginBottom:10}}>You are not alone</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.8,marginBottom:16}}>Thank you for being honest. What you're experiencing is serious and you deserve immediate support. Please reach out right now.</p>
          <div style={{textAlign:"left",background:C.white,borderRadius:16,padding:"16px 18px",marginBottom:16}}>
            <div style={{color:C.text,fontSize:14,fontWeight:700,lineHeight:2.4}}>
              📞 <a href="tel:9152987821" style={{color:C.rose,fontWeight:800}}>iCall: 9152987821</a><br/>
              📞 <a href="tel:18602662345" style={{color:C.rose,fontWeight:800}}>Vandrevala (24/7): 1860-2662-345</a><br/>
              📞 <a href="tel:08046110007" style={{color:C.rose,fontWeight:800}}>NIMHANS: 080-46110007</a><br/>
              🏥 <span style={{color:C.textMid}}>Go to your nearest government hospital emergency</span>
            </div>
          </div>
        </div>
      </Fade>
      <Fade delay={200}>
        <Card style={{marginBottom:16}}>
          <h3 style={{color:C.text,fontWeight:800,fontSize:16,marginBottom:12}}>📋 Safety Plan</h3>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:12}}>Before you close this app, please do one of these right now:</p>
          {["Call one of the helplines above","Tell someone you trust how you're feeling","Go to your nearest hospital emergency department","Remove access to anything you might use to hurt yourself"].map((s,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:8}}>
              <span style={{color:C.sage,fontWeight:800,fontSize:16}}>✓</span>
              <span style={{color:C.textMid,fontSize:14,lineHeight:1.6}}>{s}</span>
            </div>
          ))}
        </Card>
      </Fade>
      <Fade delay={300}>
        <Card style={{marginBottom:20}}>
          <h3 style={{color:C.text,fontWeight:800,fontSize:15,marginBottom:12}}>👤 Notify a trusted person (optional)</h3>
          <p style={{color:C.textMid,fontSize:13,marginBottom:14}}>Would you like to note someone who should know you need support?</p>
          <input value={notifyName} onChange={e=>setNotifyName(e.target.value)} placeholder="Their name" style={{width:"100%",padding:"12px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,fontFamily:FB,outline:"none",marginBottom:10}}/>
          <input value={notifyPhone} onChange={e=>setNotifyPhone(e.target.value)} placeholder="Their phone number (optional)" style={{width:"100%",padding:"12px 14px",borderRadius:12,border:`1.5px solid ${C.border}`,background:C.bg,color:C.text,fontSize:14,fontFamily:FB,outline:"none"}}/>
          {notifyPhone&&<a href={`tel:${notifyPhone}`} style={{display:"block",marginTop:12,padding:"12px",borderRadius:12,background:C.sage,color:C.white,fontWeight:800,fontSize:14,textAlign:"center",textDecoration:"none"}}>📞 Call {notifyName||"them"} now</a>}
        </Card>
      </Fade>
      <Fade delay={400}>
        <WarmButton onClick={()=>onComplete({level,safe:false,notifyName,notifyPhone})} variant="rose">
          I have read the safety information →
        </WarmButton>
      </Fade>
    </div>
  );

  const currentQ=CSSRS[level];
  if(!currentQ){ onComplete({level,safe:level<=2}); return null; }

  return(
    <div>
      <Fade>
        <div style={{background:C.amberLight,border:`1.5px solid ${C.amber}`,borderRadius:18,padding:"18px 20px",marginBottom:20}}>
          <p style={{color:C.amber,fontWeight:800,fontSize:14,marginBottom:6}}>💛 These questions are about your safety</p>
          <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}>You mentioned some thoughts about not being here. We need to ask a few more questions to understand how you're feeling. Please answer honestly — your safety is what matters most.</p>
        </div>
        <Pill color={C.rose}>Safety Assessment (C-SSRS)</Pill>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden",margin:"14px 0 20px"}}>
          <div style={{height:"100%",width:`${(level/5)*100}%`,background:C.rose,borderRadius:3,transition:"width 0.4s"}}/>
        </div>
        <Card style={{background:C.roseLight,border:`1.5px solid ${C.rose}44`,textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:10}}>{currentQ.emoji}</div>
          <p style={{fontFamily:FD,color:C.text,fontSize:17,lineHeight:1.7,fontWeight:600}}>{currentQ.q}</p>
        </Card>
        <div style={{display:"flex",gap:14}}>
          <button onClick={()=>handleAnswer(currentQ,false)} style={{flex:1,padding:"18px",borderRadius:16,border:`2px solid ${C.sage}`,background:C.sageLight,color:C.sage,fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:FB}}>No</button>
          <button onClick={()=>handleAnswer(currentQ,true)} style={{flex:1,padding:"18px",borderRadius:16,border:`2px solid ${C.rose}`,background:C.roseLight,color:C.rose,fontWeight:800,fontSize:16,cursor:"pointer",fontFamily:FB}}>Yes</button>
        </div>
        <p style={{color:C.textMuted,fontSize:12,textAlign:"center",marginTop:16}}>iCall helpline: <strong>9152987821</strong> — available now if you need to talk</p>
      </Fade>
    </div>
  );
}

/* ─── Section bridge ─────────────────────────────────────────────── */
function SectionBridge({title,message,emoji,color,buttonLabel,onNext}){
  return(
    <div style={{textAlign:"center",paddingTop:32}}>
      <Fade>
        <div style={{fontSize:64,marginBottom:16}}>{emoji}</div>
        <h2 style={{fontFamily:FD,fontSize:26,color:C.text,marginBottom:14}}>{title}</h2>
        <p style={{color:C.textMid,fontSize:15,lineHeight:1.85,marginBottom:32}}>{message}</p>
        <WarmButton onClick={onNext} style={{background:color,borderColor:color}}>{buttonLabel}</WarmButton>
      </Fade>
    </div>
  );
}

/* ─── FAQ Screen ─────────────────────────────────────────────────── */
function FAQScreen({phq9,gad7,onBack}){
  const [open,setOpen]=useState(null);
  const faqs=[
    {q:"What do my scores mean?",icon:"📊",a:()=>{const dl=phq9<=4?"minimal":phq9<=9?"mild":phq9<=14?"moderate":phq9<=19?"moderately severe":"severe";const al=gad7<=4?"minimal":gad7<=9?"mild":gad7<=14?"moderate":"severe";return `Your PHQ-9 score of ${phq9}/27 suggests ${dl} depression symptoms, and your GAD-7 score of ${gad7}/21 suggests ${al} anxiety symptoms.\n\nThese are validated clinical screening scores, not a diagnosis. They reflect a snapshot of the last two weeks only — not a permanent state.\n\nThink of this as a starting point for a conversation with a doctor.`;}},
    {q:"Is this a diagnosis?",icon:"🩺",a:()=>`No. ManaScreen is a validated screening tool, not a clinical diagnosis.\n\nScreening means identifying people who may benefit from further evaluation. Only a qualified psychiatrist or psychologist can make a formal diagnosis after a full clinical assessment.\n\nThe PHQ-9 and GAD-7 are used by doctors worldwide as first-step screening tools — exactly as they are used here.`},
    {q:"Should I see a psychiatrist?",icon:"🤝",a:()=>{if(phq9>=15||gad7>=15)return `Based on your scores, we strongly encourage you to see a psychiatrist or psychologist as soon as possible.\n\nYour scores suggest significant symptoms likely affecting your daily life. The earlier you reach out, the faster things can improve.\n\nFirst step: speak to your family doctor or GP, who can refer you.`;if(phq9>=10||gad7>=10)return `Yes — with scores like yours, speaking to a mental health professional would be very beneficial.\n\nYou could start with your GP or go directly to a psychiatrist or clinical psychologist.\n\nYou don't need to wait until things feel "bad enough." If your daily life is being affected, that's reason enough.`;return `Your scores suggest mild symptoms. You may not need a psychiatrist right away, but it's worth monitoring.\n\nIf symptoms persist for more than 2–3 weeks, or begin affecting work, relationships, or sleep — please do speak to a doctor.`;}},
    {q:"How do I tell my family?",icon:"👨‍👩‍👧",a:()=>`Telling family about mental health struggles can feel difficult — especially in Indian families where stigma can run deep.\n\nSome gentle ways to start:\n• Choose a calm moment — not during a conflict\n• Start small: "I've been feeling really exhausted and low lately"\n• Show them this app and your results if words feel hard\n• Ask for one specific thing: "I'd just like you to listen"\n\nMany families, once they understand, become the greatest source of support.`},
    {q:"What can I do to feel better today?",icon:"🌱",a:()=>{const tips=[];if(gad7>=5)tips.push("Try the Box Breathing exercise — 4 minutes can calm your nervous system","Step outside for 10 minutes — light and movement reduce anxiety quickly");if(phq9>=5)tips.push("Do one small thing you used to enjoy — even for 5 minutes","Write down 3 tiny things that weren't terrible today");tips.push("Drink water and eat something if you haven't","Text or call one person you trust","Be kind to yourself — you took this assessment. That took courage.");return `Here are things that can genuinely help right now:\n\n${tips.map(t=>`• ${t}`).join("\n")}\n\nRemember: you don't have to feel completely better today. Small steps count.`;}},
    {q:"Will I need medication?",icon:"💊",a:()=>`That's entirely between you and your doctor — medication is one option, not an obligation.\n\nFor mild symptoms, therapy (especially CBT) and lifestyle changes are often recommended first.\n\nFor moderate to severe symptoms, medication combined with therapy tends to work best. Modern antidepressants and anti-anxiety medications are safe and effective for most people.\n\nMany people take medication for 6–12 months then gradually stop with their doctor's guidance.`},
    {q:"Free mental health support in India",icon:"📞",a:()=>`Free, confidential resources in India:\n\n📞 iCall (TISS): 9152987821\nMon–Sat, 8am–10pm\n\n📞 Vandrevala Foundation: 1860-2662-345\n24/7, multilingual\n\n📞 NIMHANS: 080-46110007\n\n📞 Snehi: 044-24640050\n\n🏥 Government hospital psychiatry OPD — free or very low cost under Ayushman Bharat\n\n🏥 Your nearest PHC or CHC — ask for the mental health officer`},
    {q:"Can anxiety and depression be cured?",icon:"✨",a:()=>`Yes — the vast majority of people with depression and anxiety make a full or significant recovery with appropriate treatment.\n\nThink of it as "managed well" rather than "cured." Many people reach a point where symptoms are minimal and they live full, meaningful lives.\n\nKey factors: early intervention, consistent treatment, sleep, exercise, nutrition, and self-compassion.\n\nAnxiety and depression are medical conditions — just like diabetes or hypertension. They respond to treatment. You are not stuck.`},
  ];

  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.peach,cursor:"pointer",fontSize:15,fontWeight:800,marginBottom:20,padding:0,fontFamily:FB}}>← Back</button>
      <Fade>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:10}}>💬</div>
          <Pill color={C.sky}>Common Questions</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 8px"}}>Questions & Answers</h2>
        </div>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {faqs.map((faq,i)=>{
          const isOpen=open===i;
          const answer=faq.a();
          return(
            <Fade key={i} delay={i*50}>
              <div style={{borderRadius:18,border:`1.5px solid ${isOpen?C.sky:C.border}`,background:isOpen?C.skyLight:C.card,transition:"all 0.25s",overflow:"hidden"}}>
                <button onClick={()=>setOpen(isOpen?null:i)} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"18px 20px",background:"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:FB}}>
                  <span style={{fontSize:22,flexShrink:0}}>{faq.icon}</span>
                  <span style={{color:C.text,fontWeight:700,fontSize:15,flex:1}}>{faq.q}</span>
                  <span style={{color:C.textMuted,fontSize:20,transform:isOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.25s",flexShrink:0}}>›</span>
                </button>
                {isOpen&&(
                  <div style={{padding:"0 20px 20px 58px"}}>
                    {answer.split("\n").map((line,j)=>line===""?<div key={j} style={{height:6}}/>:<p key={j} style={{color:C.textMid,fontSize:14,lineHeight:1.8,marginBottom:2}}>{line}</p>)}
                  </div>
                )}
              </div>
            </Fade>
          );
        })}
      </div>
      <Fade delay={500}>
        <div style={{background:C.roseLight,border:`1.5px solid ${C.rose}44`,borderRadius:18,padding:"18px 20px",marginTop:24}}>
          <div style={{color:C.rose,fontWeight:800,fontSize:14,marginBottom:6}}>💙 Need to talk to someone right now?</div>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.75}}>iCall: <strong>9152987821</strong><br/>Vandrevala (24/7): <strong>1860-2662-345</strong></p>
        </div>
      </Fade>
    </div>
  );
}

/* ─── Exercises (abbreviated — same as before) ───────────────────── */
function BreathingExercise({exercise,onDone}){
  const [phase,setPhase]=useState(0);
  const [count,setCount]=useState(exercise.steps[0].duration);
  const [round,setRound]=useState(1);
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);
  const [scale,setScale]=useState(1);
  const intervalRef=useRef(null);
  const steps=exercise.steps;
  const totalRounds=exercise.rounds||4;

  const tick=useCallback(()=>{
    setCount(c=>{
      if(c>1)return c-1;
      setPhase(p=>{
        const next=(p+1)%steps.length;
        if(next===0)setRound(r=>{if(r>=totalRounds){setRunning(false);setDone(true);return r;}return r+1;});
        setCount(steps[next].duration);
        setScale(steps[next].label==="Breathe In"?1.4:steps[next].label==="Breathe Out"?0.85:0.95);
        return next;
      });
      return steps[(phase+1)%steps.length].duration;
    });
  },[steps,phase,totalRounds]);

  useEffect(()=>{if(running){intervalRef.current=setInterval(tick,1000);}else clearInterval(intervalRef.current);return()=>clearInterval(intervalRef.current);},[running,tick]);
  useEffect(()=>{setScale(steps[phase].label==="Breathe In"?1.4:steps[phase].label==="Breathe Out"?0.85:0.95);},[phase]);

  const cur=steps[phase];
  if(done)return(<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:64,marginBottom:16}}>✨</div><h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:10}}>Beautifully done</h3><p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28}}>Take a moment to notice how you feel.</p><WarmButton onClick={onDone}>← Back</WarmButton></div>);
  return(<div style={{textAlign:"center"}}><div style={{color:C.textSoft,fontSize:13,marginBottom:8}}>Round {round} of {totalRounds}</div><div style={{position:"relative",width:200,height:200,margin:"0 auto 28px",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{position:"absolute",inset:0,borderRadius:"50%",background:cur.color+"18",transform:`scale(${scale})`,transition:`transform ${cur.duration*0.9}s ease`}}/><div style={{position:"absolute",inset:16,borderRadius:"50%",background:cur.color+"28",transform:`scale(${scale*0.9})`,transition:`transform ${cur.duration*0.9}s ease`}}/><div style={{position:"relative",zIndex:1}}><div style={{color:cur.color,fontWeight:800,fontSize:36}}>{count}</div><div style={{color:cur.color,fontWeight:700,fontSize:14,marginTop:4}}>{cur.label}</div></div></div><p style={{fontFamily:FD,color:C.textMid,fontSize:16,lineHeight:1.7,marginBottom:24,fontStyle:"italic"}}>"{cur.instruction}"</p>{!running?<WarmButton onClick={()=>setRunning(true)} style={{background:cur.color,borderColor:cur.color}}>Begin</WarmButton>:<button onClick={()=>setRunning(false)} style={{background:"none",border:`2px solid ${C.border}`,borderRadius:18,padding:"14px",color:C.textSoft,fontSize:15,cursor:"pointer",fontFamily:FB,fontWeight:700,width:"100%"}}>Pause</button>}</div>);
}

const ALL_EXERCISES=[
  {id:"box",icon:"🫁",title:"Box Breathing",subtitle:"Calm your nervous system in 4 minutes",color:C.sky,bg:C.skyLight,why:"Box breathing activates your parasympathetic nervous system — your body's 'rest and relax' mode — within minutes.",type:"breath",steps:[{label:"Breathe In",duration:4,instruction:"Slowly breathe in through your nose",color:C.sky},{label:"Hold",duration:4,instruction:"Hold gently",color:C.lavender},{label:"Breathe Out",duration:4,instruction:"Slowly breathe out through your mouth",color:C.sage},{label:"Hold",duration:4,instruction:"Hold the empty breath",color:C.amber}],rounds:4},
  {id:"478",icon:"🌬️",title:"4-7-8 Breathing",subtitle:"A natural tranquiliser for your mind",color:C.lavender,bg:C.lavenderLight,why:"The extended exhale triggers a relaxation response, especially helpful before sleep or during panic.",type:"breath",steps:[{label:"Breathe In",duration:4,instruction:"Inhale through your nose",color:C.sky},{label:"Hold",duration:7,instruction:"Hold completely still",color:C.lavender},{label:"Breathe Out",duration:8,instruction:"Exhale fully through your mouth",color:C.sage}],rounds:4},
  {id:"ground",icon:"🌿",title:"5-4-3-2-1 Grounding",subtitle:"Anchor yourself to the present moment",color:C.sage,bg:C.sageLight,why:"Grounds you in the present moment through your senses, interrupting anxious thought spirals.",type:"simple",instructions:["Name 5 things you can SEE right now","Touch 4 things around you — notice how they feel","Listen for 3 sounds in your environment","Notice 2 things you can smell (or remember a scent you love)","Notice 1 thing you can taste right now"]},
  {id:"comp",icon:"💛",title:"Self-Compassion Pause",subtitle:"Speak to yourself like a dear friend",color:C.peach,bg:C.peachLight,why:"Self-compassion reduces the harsh inner criticism that depression amplifies.",type:"simple",instructions:["Place a hand on your heart and take a slow breath","Say to yourself: 'This is a moment of suffering'","Say: 'Suffering is part of being human — I am not alone'","Say: 'May I be kind to myself in this moment'","Rest here for 60 seconds — just breathe and be gentle"]},
];

function SimpleExercise({exercise,onDone}){
  const [step,setStep]=useState(0);
  const [done,setDone]=useState(false);
  if(done)return(<div style={{textAlign:"center",padding:"32px 0"}}><div style={{fontSize:64,marginBottom:16}}>✨</div><h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:10}}>Well done</h3><p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28}}>Take a moment to notice how you feel.</p><WarmButton onClick={onDone}>← Back</WarmButton></div>);
  return(<div><div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden",marginBottom:24}}><div style={{height:"100%",width:`${(step/exercise.instructions.length)*100}%`,background:exercise.color,borderRadius:3,transition:"width 0.4s"}}/></div><Card style={{background:exercise.bg,border:`1.5px solid ${exercise.color}33`,textAlign:"center",marginBottom:24,minHeight:140,display:"flex",alignItems:"center",justifyContent:"center"}}><p style={{fontFamily:FD,color:C.text,fontSize:19,lineHeight:1.7,fontWeight:600}}>{exercise.instructions[step]}</p></Card><p style={{color:C.textSoft,fontSize:13,textAlign:"center",marginBottom:20}}>Step {step+1} of {exercise.instructions.length} — take your time</p><WarmButton onClick={()=>{if(step+1<exercise.instructions.length)setStep(step+1);else setDone(true);}} style={{background:exercise.color,borderColor:exercise.color}}>{step+1<exercise.instructions.length?"Next step →":"Complete ✓"}</WarmButton></div>);
}

function ExercisesScreen({onDone}){
  const [active,setActive]=useState(null);
  if(active){
    const ex=ALL_EXERCISES.find(e=>e.id===active);
    return(<div><button onClick={()=>setActive(null)} style={{background:"none",border:"none",color:C.peach,cursor:"pointer",fontSize:15,fontWeight:800,marginBottom:24,padding:0,fontFamily:FB}}>← Back to exercises</button><Fade><div style={{marginBottom:20}}><div style={{fontSize:44,marginBottom:8}}>{ex.icon}</div><h2 style={{fontFamily:FD,fontSize:24,color:C.text,marginBottom:6}}>{ex.title}</h2><div style={{background:ex.bg,border:`1.5px solid ${ex.color}33`,borderRadius:14,padding:"14px 16px",marginBottom:20}}><div style={{color:ex.color,fontWeight:800,fontSize:13,marginBottom:4}}>💡 Why this helps</div><p style={{color:C.textMid,fontSize:14,lineHeight:1.7}}>{ex.why}</p></div></div>{ex.type==="breath"?<BreathingExercise exercise={ex} onDone={()=>setActive(null)}/>:<SimpleExercise exercise={ex} onDone={()=>setActive(null)}/>}</Fade></div>);
  }
  return(<div><Fade><div style={{textAlign:"center",marginBottom:28}}><div style={{fontSize:52,marginBottom:10}}>🌿</div><Pill color={C.sage}>Calming Exercises</Pill><h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 10px"}}>Try an exercise</h2><p style={{color:C.textMid,fontSize:15,lineHeight:1.75}}>Evidence-based tools to help you feel better right now.</p></div></Fade><div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>{ALL_EXERCISES.map((ex,i)=><Fade key={ex.id} delay={i*80}><button onClick={()=>setActive(ex.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"18px 20px",background:C.card,border:`1.5px solid ${C.border}`,borderRadius:20,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=ex.color;e.currentTarget.style.background=ex.color+"0c";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}><div style={{width:52,height:52,borderRadius:15,background:ex.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{ex.icon}</div><div style={{flex:1}}><div style={{color:C.text,fontWeight:800,fontSize:15,marginBottom:2}}>{ex.title}</div><div style={{color:C.textSoft,fontSize:13}}>{ex.subtitle}</div></div><span style={{color:C.textMuted,fontSize:22}}>›</span></button></Fade>)}</div><WarmButton onClick={onDone} variant="secondary">← Back to results</WarmButton></div>);
}

/* ─── Learn Screen ───────────────────────────────────────────────── */
function LearnScreen({onBack}){
  const topics=[
    {id:"dep",icon:"🌧️",title:"What is Depression?",color:C.sky,body:`Depression is far more than sadness. It's a real medical condition that changes how you think, feel, and function.\n\nYou might notice:\n• A heavy, empty feeling that won't lift\n• No longer enjoying things you used to love\n• Exhaustion even after sleep\n• Feeling worthless or like a burden\n\nIn India, depression often shows up as physical symptoms — headaches, body pain, fatigue — which can make it easy to miss.\n\nDepression is NOT a character flaw or weakness. It is a medical condition and it is treatable.`},
    {id:"anx",icon:"⚡",title:"What is Anxiety?",color:C.amber,body:`Some anxiety is natural. But when worry becomes constant and overwhelming, it may be an anxiety disorder.\n\nYou might notice:\n• Racing thoughts that won't slow down\n• Physical symptoms — racing heart, sweating, breathlessness\n• Avoiding situations that trigger worry\n• Trouble sleeping\n\nIn India, common triggers include academic pressure, career stress, family expectations, financial worry, and relationship stress.\n\nAnxiety is very manageable with the right support.`},
    {id:"bipolar",icon:"🌓",title:"What is Bipolar Disorder?",color:C.lavender,body:`Bipolar disorder involves episodes of very low mood (depression) alternating with episodes of very high or irritable mood (mania or hypomania).\n\nIt is often missed or mistaken for regular depression.\n\nSigns of a manic or hypomanic episode:\n• Feeling unusually energised or euphoric\n• Needing very little sleep\n• Racing thoughts, talking faster than usual\n• Taking unusual risks\n• Extreme irritability\n\nBipolar disorder is very treatable with mood stabilisers and therapy. Early diagnosis makes a significant difference.`},
    {id:"ptsd",icon:"🌪️",title:"What is PTSD?",color:C.rose,body:`Post-Traumatic Stress Disorder (PTSD) can develop after experiencing or witnessing a traumatic event.\n\nIt can look like depression or anxiety — and is often missed.\n\nCommon symptoms:\n• Flashbacks or intrusive memories\n• Nightmares\n• Avoiding reminders of the event\n• Feeling constantly on edge or startled\n• Emotional numbness\n\nPTSD is very treatable. Trauma-focused therapies like EMDR and Prolonged Exposure are highly effective.\n\nIn India, PTSD from road accidents, domestic violence, natural disasters, and loss is very common and very underdiagnosed.`},
    {id:"help",icon:"🤝",title:"When Should I Seek Help?",color:C.sage,body:`Please consider speaking to a professional if:\n\n• Symptoms have lasted more than 2 weeks\n• Daily life is being affected\n• You're using substances to cope\n• You're having thoughts of hurting yourself\n\nWho can help in India:\n• Psychiatrist — diagnosis and medication\n• Clinical Psychologist — therapy\n• GP — great first step, can refer\n\nCrisis lines:\niCall: 9152987821\nVandrevala (24/7): 1860-2662-345\nNIMHANS: 080-46110007`},
    {id:"care",icon:"🌱",title:"Gentle Self-Care",color:C.peach,body:`Small daily practices that genuinely help:\n\nBody:\n• Consistent sleep and wake time\n• 15-minute daily walk\n• Regular meals\n\nMind:\n• 3 gratitudes each morning\n• 5 minutes pranayama or deep breathing\n• Limit social media scrolling\n• Self-compassion — talk to yourself kindly\n\nConnection:\n• Tell one trusted person how you're feeling\n• Stay connected even when it's hard\n\nHealing is not linear. Some days will be harder. That's okay.`},
    {id:"fam",icon:"👨‍👩‍👧",title:"For Family & Caregivers",color:"#9b72cf",body:`If someone you love is struggling:\n\nWhat helps:\n• Listen without judgment\n• "I'm here for you"\n• Help them access care\n• Check in regularly\n• Be patient\n\nWhat doesn't help:\n• "Think positive"\n• "Others have it worse"\n• "Pull yourself together"\n\nYour wellbeing matters too:\n• Caregiver burnout is real\n• It's okay to feel helpless\n• Seek support for yourself too`},
  ];
  const [topic,setTopic]=useState(null);
  if(topic)return(<div><button onClick={()=>setTopic(null)} style={{background:"none",border:"none",color:C.peach,cursor:"pointer",fontSize:15,fontWeight:800,marginBottom:20,padding:0,fontFamily:FB}}>← Back</button><Fade><div style={{fontSize:48,marginBottom:12}}>{topic.icon}</div><h2 style={{fontFamily:FD,fontSize:24,color:C.text,marginBottom:20}}>{topic.title}</h2>{topic.body.split("\n").map((line,i)=>{const isHead=line.length>0&&line.length<38&&!line.startsWith("•")&&!line.match(/^[📞🏥]/);return line===""?<div key={i} style={{height:8}}/>:<p key={i} style={{color:isHead?topic.color:C.textMid,fontWeight:isHead?800:400,fontSize:15,lineHeight:1.8,marginBottom:isHead?4:2}}>{line}</p>;})}</Fade></div>);
  return(<div><button onClick={onBack} style={{background:"none",border:"none",color:C.peach,cursor:"pointer",fontSize:15,fontWeight:800,marginBottom:20,padding:0,fontFamily:FB}}>← Back</button><Fade><h2 style={{fontFamily:FD,fontSize:26,color:C.text,marginBottom:6}}>Learn & Understand</h2><p style={{color:C.textMid,fontSize:15,marginBottom:24}}>Guides to help you make sense of mental health.</p></Fade><div style={{display:"flex",flexDirection:"column",gap:12}}>{topics.map((t,i)=><Fade key={t.id} delay={i*70}><button onClick={()=>setTopic(t)} style={{display:"flex",alignItems:"center",gap:16,padding:"18px 20px",background:C.card,border:`1.5px solid ${C.border}`,borderRadius:20,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=t.color;e.currentTarget.style.background=t.color+"0f";}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}><div style={{width:50,height:50,borderRadius:15,background:t.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{t.icon}</div><span style={{color:C.text,fontWeight:800,fontSize:15,flex:1}}>{t.title}</span><span style={{color:C.textMuted,fontSize:22}}>›</span></button></Fade>)}</div></div>);
}

/* ─── Clinical Report (Results) ──────────────────────────────────── */
function ResultScreen({data,onExercises,onFAQ,onLearn,onRetake}){
  const {phq9,gad7,phq15,mdq,trauma,sleep,psychosis,functional,medical,duration,profile,safety}=data;

  const dep=phq9<=4?{label:"Minimal",color:C.sage,icon:"🌱"}:phq9<=9?{label:"Mild",color:C.sky,icon:"🌤️"}:phq9<=14?{label:"Moderate",color:C.amber,icon:"🌧️"}:phq9<=19?{label:"Moderately Severe",color:C.peach,icon:"🌩️"}:{label:"Severe",color:C.rose,icon:"⛈️"};
  const anx=gad7<=4?{label:"Minimal",color:C.sage,icon:"🌱"}:gad7<=9?{label:"Mild",color:C.sky,icon:"🌤️"}:gad7<=14?{label:"Moderate",color:C.amber,icon:"🌧️"}:{label:"Severe",color:C.rose,icon:"⛈️"};
  const isCrisis=phq9>=20||gad7>=15||safety?.level>=3;
  const needsHelp=phq9>=10||gad7>=10;
  const allGood=phq9<=4&&gad7<=4;
  const hasBipolarFlag=mdq?.positive;
  const hasPTSD=trauma?.positive;
  const hasPsychosis=psychosis?.flag;
  const poorSleep=sleep?.poor;
  const highSomatic=phq15>=10;
  const chronicDuration=["chronic","longterm"].includes(duration?.duration);

  const functionalAvg=functional?Math.round(Object.values(functional).reduce((a,b)=>a+b,0)/3):null;

  return(
    <div>
      <Fade>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontSize:52,marginBottom:10}}>{allGood?"🌸":isCrisis?"💙":"🌿"}</div>
          <Pill color={C.peach}>Clinical Summary</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 8px"}}>{allGood?"You seem to be doing well":isCrisis?"Thank you for your honesty":"Here's your full assessment"}</h2>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.75}}>
            {allGood?"Your responses suggest low levels of depression and anxiety right now.":"These results reflect a snapshot of the last 2 weeks. They are a starting point — not a final answer."}
          </p>
          {chronicDuration&&<div style={{marginTop:10,background:C.amberLight,border:`1px solid ${C.amber}44`,borderRadius:10,padding:"8px 14px",fontSize:13,color:C.amber,fontWeight:700}}>⏱️ Duration: {duration.duration==="chronic"?"3–12 months":"Over 1 year"} — chronic presentation</div>}
        </div>
      </Fade>

      {isCrisis&&(
        <Fade delay={100}>
          <div style={{background:C.roseLight,border:`2px solid ${C.rose}`,borderRadius:22,padding:"22px",marginBottom:20}}>
            <p style={{color:C.rose,fontWeight:800,fontSize:16,marginBottom:8}}>💙 Please reach out for support today</p>
            <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:14}}>Your scores suggest you may be going through a very difficult time. You deserve care and support right now.</p>
            <div style={{color:C.text,fontSize:14,fontWeight:700,lineHeight:2.2}}>
              📞 <a href="tel:9152987821" style={{color:C.rose}}>iCall: 9152987821</a><br/>
              📞 <a href="tel:18602662345" style={{color:C.rose}}>Vandrevala (24/7): 1860-2662-345</a><br/>
              📞 <a href="tel:08046110007" style={{color:C.rose}}>NIMHANS: 080-46110007</a>
            </div>
          </div>
        </Fade>
      )}

      {/* Core scores */}
      <Fade delay={180}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          {[{label:"Depression",code:"PHQ-9",score:phq9,max:27,level:dep},{label:"Anxiety",code:"GAD-7",score:gad7,max:21,level:anx}].map(({label,code,score,max,level})=>(
            <Card key={code} style={{textAlign:"center",background:level.color+"0e",border:`1.5px solid ${level.color}44`}}>
              <div style={{fontSize:28,marginBottom:4}}>{level.icon}</div>
              <div style={{color:C.textSoft,fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:1}}>{label}</div>
              <div style={{color:level.color,fontWeight:800,fontSize:20,margin:"3px 0"}}>{score}<span style={{fontSize:12,color:C.textMuted}}>/{max}</span></div>
              <div style={{background:level.color+"22",color:level.color,fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20,display:"inline-block"}}>{level.label}</div>
            </Card>
          ))}
        </div>
      </Fade>

      {/* Adaptive clinical flags */}
      {(hasBipolarFlag||hasPTSD||hasPsychosis||poorSleep||highSomatic||functionalAvg>=6)&&(
        <Fade delay={240}>
          <Card style={{marginBottom:16}}>
            <div style={{color:C.textSoft,fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:1.5,marginBottom:14}}>⚠️ Additional Clinical Flags</div>
            {hasBipolarFlag&&<div style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:18}}>🌓</span><div><div style={{color:C.lavender,fontWeight:800,fontSize:14}}>Possible Bipolar Spectrum</div><div style={{color:C.textMid,fontSize:13,lineHeight:1.6}}>Your MDQ responses suggest possible bipolar spectrum symptoms. Please discuss this specifically with your psychiatrist — this significantly affects treatment choice.</div></div></div>}
            {hasPTSD&&<div style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:18}}>🌪️</span><div><div style={{color:C.rose,fontWeight:800,fontSize:14}}>Possible PTSD</div><div style={{color:C.textMid,fontSize:13,lineHeight:1.6}}>Your trauma screen suggests possible PTSD symptoms. Trauma-focused therapy (EMDR, Prolonged Exposure) is highly effective — mention this to your doctor.</div></div></div>}
            {hasPsychosis&&<div style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:18}}>🧠</span><div><div style={{color:C.teal,fontWeight:800,fontSize:14}}>Perceptual Experiences Noted</div><div style={{color:C.textMid,fontSize:13,lineHeight:1.6}}>You reported some unusual perceptual experiences. These can have many causes — stress, sleep deprivation, or other medical conditions. Please discuss with a psychiatrist.</div></div></div>}
            {poorSleep&&<div style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:18}}>😴</span><div><div style={{color:C.indigo,fontWeight:800,fontSize:14}}>Poor Sleep Quality</div><div style={{color:C.textMid,fontSize:13,lineHeight:1.6}}>Your sleep screen suggests poor sleep quality. Sleep and mental health are deeply connected — addressing sleep often significantly improves mood and anxiety.</div></div></div>}
            {highSomatic&&<div style={{display:"flex",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}><span style={{fontSize:18}}>🫄</span><div><div style={{color:C.amber,fontWeight:800,fontSize:14}}>Significant Physical Symptoms</div><div style={{color:C.textMid,fontSize:13,lineHeight:1.6}}>Your PHQ-15 suggests significant physical symptoms that may be related to your mental health. This is very common in Indian presentations of depression — please mention these to your doctor.</div></div></div>}
            {functionalAvg>=6&&<div style={{display:"flex",gap:10,padding:"10px 0"}}><span style={{fontSize:18}}>💼</span><div><div style={{color:C.peach,fontWeight:800,fontSize:14}}>Significant Functional Impairment</div><div style={{color:C.textMid,fontSize:13,lineHeight:1.6}}>Your symptoms are significantly affecting your daily functioning (average impact: {functionalAvg}/10). This level of impairment supports prioritising professional help soon.</div></div></div>}
          </Card>
        </Fade>
      )}

      {/* Medical context */}
      {medical&&Object.values(medical).some(v=>v==="Yes")&&(
        <Fade delay={300}>
          <Card style={{marginBottom:16,background:C.tealLight,border:`1.5px solid ${C.teal}44`}}>
            <div style={{color:C.teal,fontWeight:800,fontSize:14,marginBottom:8}}>🏥 Medical Context to Share with Your Doctor</div>
            {medical.thyroid==="Yes"&&<p style={{color:C.textMid,fontSize:13,lineHeight:1.6,marginBottom:6}}>• <strong>Thyroid condition:</strong> Ensure your thyroid function has been checked recently — thyroid disorders directly cause depression and anxiety symptoms.</p>}
            {medical.meds==="Yes"&&<p style={{color:C.textMid,fontSize:13,lineHeight:1.6,marginBottom:6}}>• <strong>Current medications:</strong> Show your doctor the full list — some medications affect mood as a side effect.</p>}
            {medical.substances==="Yes"&&<p style={{color:C.textMid,fontSize:13,lineHeight:1.6,marginBottom:6}}>• <strong>Substance use:</strong> Be honest with your doctor about this — it significantly affects treatment planning.</p>}
            {medical.family==="Yes"&&<p style={{color:C.textMid,fontSize:13,lineHeight:1.6,marginBottom:6}}>• <strong>Family history:</strong> Mention this to your doctor — genetic factors affect diagnosis and treatment choice.</p>}
          </Card>
        </Fade>
      )}

      {/* Next steps */}
      {needsHelp&&(
        <Fade delay={350}>
          <Card style={{marginBottom:16,background:C.sageLight,border:`1.5px solid ${C.sage}55`}}>
            <div style={{color:C.sage,fontWeight:800,fontSize:15,marginBottom:12}}>🌿 Recommended next steps</div>
            {[
              phq9>=15||gad7>=15?"See a psychiatrist as a priority — sooner rather than later":"Consider speaking to your GP or a counsellor",
              "Share this full report with your doctor — screenshot or show them this page",
              hasBipolarFlag?"Ask specifically about mood stabiliser evaluation":"Ask about therapy options (CBT is highly effective)",
              "Return to complete this assessment again in 2–4 weeks to track your progress",
              "Use the calming exercises in this app daily while waiting for your appointment",
            ].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                <span style={{color:C.sage,fontWeight:800,fontSize:16,marginTop:1}}>{i+1}.</span>
                <span style={{color:C.textMid,fontSize:14,lineHeight:1.65}}>{s}</span>
              </div>
            ))}
          </Card>
        </Fade>
      )}

      {/* Disclaimer */}
      <Fade delay={400}>
        <div style={{background:C.amberLight,border:`1px solid ${C.amber}33`,borderRadius:14,padding:"14px 16px",marginBottom:20}}>
          <p style={{color:C.textMid,fontSize:12,lineHeight:1.7}}>
            ⚠️ <strong>Important:</strong> These scores reflect the last 2 weeks only and may be influenced by situational factors, cultural context, physical health, and how questions were interpreted. This tool was designed for adults and is a screening aid — not a clinical diagnosis. Always discuss results with a qualified mental health professional.
          </p>
        </div>
      </Fade>

      <Fade delay={440}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button onClick={onExercises} style={{width:"100%",padding:"20px 22px",borderRadius:22,border:`2px solid ${C.sage}`,background:`linear-gradient(135deg,${C.sageLight} 0%,#f0faf4 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:16,boxShadow:"0 3px 16px rgba(107,158,130,0.15)"}}>
            <div style={{width:52,height:52,borderRadius:16,background:C.sage,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🌿</div>
            <div style={{flex:1}}><div style={{color:C.sage,fontWeight:800,fontSize:16,marginBottom:2}}>Try a calming exercise</div><div style={{color:C.textMid,fontSize:13}}>Breathing, grounding & more</div></div>
            <span style={{color:C.sage,fontSize:24}}>›</span>
          </button>
          <button onClick={onFAQ} style={{width:"100%",padding:"20px 22px",borderRadius:22,border:`2px solid ${C.sky}`,background:`linear-gradient(135deg,${C.skyLight} 0%,#f0f6ff 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:16,boxShadow:"0 3px 16px rgba(91,143,201,0.12)"}}>
            <div style={{width:52,height:52,borderRadius:16,background:C.sky,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>💬</div>
            <div style={{flex:1}}><div style={{color:C.sky,fontWeight:800,fontSize:16,marginBottom:2}}>Common questions answered</div><div style={{color:C.textMid,fontSize:13}}>Personalised to your results</div></div>
            <span style={{color:C.sky,fontSize:24}}>›</span>
          </button>
          <WarmButton onClick={onLearn} variant="secondary">📚 Learn about mental health</WarmButton>
          <WarmButton onClick={onRetake} variant="ghost">↩ Start over</WarmButton>
        </div>
      </Fade>
    </div>
  );
}

/* ─── Welcome Screen ─────────────────────────────────────────────── */
function WelcomeScreen({onNext}){
  return(
    <div style={{textAlign:"center",paddingTop:24}}>
      <Fade><div style={{fontSize:70,marginBottom:10,lineHeight:1}}>🌸</div>
        <h1 style={{fontFamily:FD,fontSize:38,fontWeight:700,color:C.text,marginBottom:6}}>ManaScreen</h1>
        <p style={{color:C.textSoft,fontSize:13,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,marginBottom:8}}>Mental Wellness Assessment</p>
        <p style={{color:C.textMuted,fontSize:12,marginBottom:28}}>Clinically validated · DSM-5 aligned · Completely private</p>
      </Fade>
      <Fade delay={180}>
        <Card style={{marginBottom:18,background:C.peachLight,border:`1.5px solid ${C.peach}33`}}>
          <p style={{fontFamily:FD,color:C.textMid,fontSize:16,lineHeight:1.85,fontStyle:"italic"}}>"You've taken the first step just by being here. This is a safe, private space — just for you."</p>
        </Card>
      </Fade>
      <Fade delay={300}>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:22}}>
          {[[C.sage,"🔒","Completely private","Nothing is saved or shared"],[C.sky,"⏱️","10–15 minutes","Comprehensive but thorough"],[C.peach,"🏥","Clinically validated","PHQ-9, GAD-7, MDQ, C-SSRS & more"],[C.amber,"🌿","Adaptive assessment","Questions adjust based on your responses"]].map(([col,icon,title,sub])=>(
            <div key={title} style={{display:"flex",gap:14,alignItems:"center",padding:"13px 16px",background:col+"13",borderRadius:14,border:`1px solid ${col}30`}}>
              <span style={{fontSize:22}}>{icon}</span>
              <div style={{textAlign:"left"}}><div style={{fontWeight:800,color:C.text,fontSize:14}}>{title}</div><div style={{color:C.textSoft,fontSize:13}}>{sub}</div></div>
            </div>
          ))}
        </div>
      </Fade>
      <Fade delay={450}>
        <div style={{background:C.roseLight,border:`1.5px solid ${C.rose}44`,borderRadius:16,padding:"16px 18px",marginBottom:26,textAlign:"left"}}>
          <div style={{color:C.rose,fontWeight:800,fontSize:13,marginBottom:6}}>💙 Need help right now?</div>
          <div style={{color:C.textMid,fontSize:14,lineHeight:1.75}}>iCall: <strong>9152987821</strong> · Vandrevala (24/7): <strong>1860-2662-345</strong></div>
        </div>
        <WarmButton onClick={onNext}>Begin Assessment 🌱</WarmButton>
        <p style={{color:C.textMuted,fontSize:12,marginTop:14,lineHeight:1.6}}>By continuing, you acknowledge this is a wellness screening tool, not a clinical diagnosis. For adults 18+.</p>
      </Fade>
    </div>
  );
}

/* ─── Root App with adaptive flow ────────────────────────────────── */
const STEP={
  WELCOME:"welcome", WHO:"who", PROFILE:"profile",
  MEDICAL:"medical", DURATION:"duration",
  PHQ9:"phq9", BRIDGE:"bridge", GAD7:"gad7",
  CSSRS:"cssrs",
  PHQ15:"phq15", MDQ:"mdq", TRAUMA:"trauma",
  SLEEP:"sleep", PSYCHOSIS:"psychosis", FUNCTIONAL:"functional",
  RESULT:"result", EXERCISES:"exercises", FAQ:"faq", LEARN:"learn",
};

export default function App(){
  const [step,setStep]=useState(STEP.WELCOME);
  const [who,setWho]=useState("self");
  const [data,setData]=useState({});
  const reset=()=>{setStep(STEP.WELCOME);setData({});};

  const update=(key,val)=>setData(d=>({...d,[key]:val}));

  // After GAD-7 completes, decide adaptive path
  const afterGAD7=(score)=>{
    update("gad7",score);
    // C-SSRS triggered if PHQ-9 Q9 was endorsed (last answer in phq9answers)
    const phq9answers=data.phq9answers||[];
    const suicidalityEndorsed=phq9answers[8]>0;
    if(suicidalityEndorsed) setStep(STEP.CSSRS);
    else afterSafety({level:0,safe:true});
  };

  const afterSafety=(safetyData)=>{
    update("safety",safetyData);
    const phq9=data.phq9||0;
    const gad7=data.gad7||0;
    // Adaptive: show additional screens based on scores
    if(phq9>=5||gad7>=5) setStep(STEP.PHQ15);
    else setStep(STEP.FUNCTIONAL);
  };

  const afterPHQ15=(score)=>{
    update("phq15",score);
    const phq9=data.phq9||0;
    const gad7=data.gad7||0;
    // MDQ if any depressive symptoms
    if(phq9>=5) setStep(STEP.MDQ);
    else if(gad7>=5) setStep(STEP.TRAUMA);
    else setStep(STEP.SLEEP);
  };

  const afterMDQ=(mdqData)=>{
    update("mdq",mdqData);
    setStep(STEP.TRAUMA);
  };

  const afterTrauma=(traumaData)=>{
    update("trauma",traumaData);
    setStep(STEP.SLEEP);
  };

  const afterSleep=(sleepData)=>{
    update("sleep",sleepData);
    const phq9=data.phq9||0;
    const gad7=data.gad7||0;
    // Psychosis screen for younger adults with moderate+ symptoms
    if((phq9>=10||gad7>=10)&&["18-25","26-40"].includes(data.profile?.ageGroup)) setStep(STEP.PSYCHOSIS);
    else setStep(STEP.FUNCTIONAL);
  };

  const afterPsychosis=(psychosisData)=>{
    update("psychosis",psychosisData);
    setStep(STEP.FUNCTIONAL);
  };

  const afterFunctional=(functionalData)=>{
    update("functional",functionalData);
    setStep(STEP.RESULT);
  };

  const whoOpts=[
    {icon:"🙋",label:"I'm checking in on myself",sub:"For my own wellbeing",val:"self"},
    {icon:"👨‍👩‍👧",label:"I'm a family member or caregiver",sub:"For someone I love",val:"caregiver"},
    {icon:"🩺",label:"I already see a specialist",sub:"Tracking between visits",val:"existing"},
  ];

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
      <div style={{position:"relative",zIndex:1,maxWidth:440,margin:"0 auto",padding:"28px 20px 60px"}}>
        {step!==STEP.WELCOME&&(
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
            <div style={{fontFamily:FD,color:C.peach,fontWeight:700,fontSize:20}}>🌸 ManaScreen</div>
            {[STEP.RESULT,STEP.EXERCISES,STEP.FAQ,STEP.LEARN].includes(step)&&<button onClick={reset} style={{background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:13,fontFamily:FB}}>Start over</button>}
          </div>
        )}

        {step===STEP.WELCOME && <WelcomeScreen onNext={()=>setStep(STEP.WHO)}/>}

        {step===STEP.WHO && (
          <div>
            <Fade>
              <Pill color={C.peach}>Step 1</Pill>
              <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 8px"}}>Who is this for today?</h2>
              <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:24}}>This helps us personalise your assessment.</p>
            </Fade>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {whoOpts.map((o,i)=>(
                <Fade key={o.val} delay={i*100}>
                  <button onClick={()=>{setWho(o.val);update("who",o.val);setStep(STEP.PROFILE);}} style={{display:"flex",alignItems:"center",gap:16,padding:"20px",background:C.card,border:`2px solid ${C.border}`,borderRadius:20,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.peach;e.currentTarget.style.background=C.peachLight;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}>
                    <span style={{fontSize:32}}>{o.icon}</span>
                    <div><div style={{color:C.text,fontWeight:800,fontSize:15}}>{o.label}</div><div style={{color:C.textSoft,fontSize:13,marginTop:3}}>{o.sub}</div></div>
                    <span style={{marginLeft:"auto",color:C.textMuted,fontSize:22}}>›</span>
                  </button>
                </Fade>
              ))}
            </div>
          </div>
        )}

        {step===STEP.PROFILE && <ProfileScreen onComplete={p=>{update("profile",p);setStep(STEP.MEDICAL);}}/>}
        {step===STEP.MEDICAL && <MedicalHistoryScreen onComplete={m=>{update("medical",m);setStep(STEP.DURATION);}}/>}
        {step===STEP.DURATION && <DurationScreen onComplete={d=>{update("duration",d);setStep(STEP.PHQ9);}}/>}

        {step===STEP.PHQ9 && (
          <LikertScreen questions={PHQ9} code="PHQ-9" color={C.sky} bgColor={C.skyLight} sectionTitle="Depression" options={FREQ4}
            onComplete={(score,answers)=>{update("phq9",score);update("phq9answers",answers);setStep(STEP.BRIDGE);}}/>
        )}

        {step===STEP.BRIDGE && (
          <SectionBridge title="Halfway there 🌿" message={`You've completed the depression screen. You're doing wonderfully.\n\nNext: 7 questions about anxiety and worry. Take a gentle breath when you're ready.`} emoji="🌿" color={C.sage} buttonLabel="Continue to Anxiety section →" onNext={()=>setStep(STEP.GAD7)}/>
        )}

        {step===STEP.GAD7 && (
          <LikertScreen questions={GAD7} code="GAD-7" color={C.sage} bgColor={C.sageLight} sectionTitle="Anxiety" options={FREQ4}
            onComplete={(score)=>afterGAD7(score)}/>
        )}

        {step===STEP.CSSRS && <SafetyScreen onComplete={s=>{update("safety",s);afterSafety(s);}}/>}

        {step===STEP.PHQ15 && (
          <LikertScreen questions={PHQ15} code="PHQ-15" color={C.amber} bgColor={C.amberLight} sectionTitle="Physical Symptoms" options={FREQ3}
            onComplete={(score)=>afterPHQ15(score)}/>
        )}

        {step===STEP.MDQ && <MDQScreen onComplete={afterMDQ}/>}
        {step===STEP.TRAUMA && <TraumaScreen onComplete={afterTrauma}/>}
        {step===STEP.SLEEP && <SleepScreen onComplete={afterSleep}/>}
        {step===STEP.PSYCHOSIS && <PsychosisScreen onComplete={afterPsychosis}/>}
        {step===STEP.FUNCTIONAL && <FunctionalScreen onComplete={afterFunctional}/>}

        {step===STEP.RESULT && (
          <ResultScreen data={data}
            onExercises={()=>setStep(STEP.EXERCISES)}
            onFAQ={()=>setStep(STEP.FAQ)}
            onLearn={()=>setStep(STEP.LEARN)}
            onRetake={reset}/>
        )}

        {step===STEP.EXERCISES && <ExercisesScreen onDone={()=>setStep(STEP.RESULT)}/>}
        {step===STEP.FAQ && <FAQScreen phq9={data.phq9||0} gad7={data.gad7||0} onBack={()=>setStep(STEP.RESULT)}/>}
        {step===STEP.LEARN && <LearnScreen onBack={()=>setStep(STEP.RESULT)}/>}
      </div>
    </div>
  );
}
