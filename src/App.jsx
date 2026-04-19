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
        if(current+1<questions.length){setAnswers(na);setCurrent(c=>c+1);setSelected(null);setVisible(true);}
        else onComplete(na.reduce((a,b)=>a+(b==="skip"?0:b),0),na);
      },300);
    },900);
  };
  const handleSkip=()=>{
    setShowSkip(false);
    const na=[...answers,"skip"];
    setVisible(false);
    setTimeout(()=>{
      if(current+1<questions.length){setAnswers(na);setCurrent(c=>c+1);setSelected(null);setVisible(true);}
      else onComplete(na.reduce((a,b)=>a+(b==="skip"?0:b),0),na);
    },250);
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
function WindDown({onContinue}){
  const [phase,setPhase]=useState("in");
  const [count,setCount]=useState(4);
  const [round,setRound]=useState(1);
  const totalRounds=3;
  const [scale,setScale]=useState(1);

  useEffect(()=>{
    const timer=setInterval(()=>{
      setCount(c=>{
        if(c>1)return c-1;
        setPhase(p=>{
          const next=p==="in"?"hold":p==="hold"?"out":"in";
          if(next==="in")setRound(r=>r+1);
          setCount(next==="in"?4:next==="hold"?4:6);
          setScale(next==="in"?1.4:next==="out"?0.85:0.95);
          return next;
        });
        return phase==="in"?4:phase==="hold"?4:6;
      });
    },1000);
    return()=>clearInterval(timer);
  },[phase]);

  useEffect(()=>{setScale(phase==="in"?1.4:phase==="out"?0.85:0.95);},[phase]);

  const label=phase==="in"?"Breathe In":phase==="hold"?"Hold":"Breathe Out";

  return(
    <div style={{textAlign:"center",paddingTop:30}}>
      <Fade>
        <Pill color={C.sage}>A moment for you</Pill>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,margin:"14px 0 8px"}}>You've just answered some hard questions</h2>
        <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28}}>Before we look at
