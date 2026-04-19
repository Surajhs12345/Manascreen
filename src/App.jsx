import { useState, useEffect, useRef, useCallback } from "react";

/* ── Design tokens ─────────────────────────────────────────── */
const C = {
  bg:"#fdf8f4", card:"#ffffff", border:"#f0e6da",
  sage:"#6b9e82", sageLight:"#e8f4ed",
  peach:"#e8845a", peachLight:"#fdeee6",
  sky:"#5b8fc9", skyLight:"#e8f0fa",
  amber:"#d4972a", amberLight:"#fdf3dc",
  rose:"#c9606a", roseLight:"#fce8ea",
  lavender:"#9b7fc9", lavenderLight:"#f0eafb",
  teal:"#4aabb0", tealLight:"#e4f6f7",
  text:"#2d2420", textMid:"#6b5c54", textSoft:"#a08a7e", textMuted:"#c4b0a8",
  white:"#ffffff",
};
const FD = "'Lora', Georgia, serif";
const FB = "'Nunito', 'Segoe UI', sans-serif";

/* ── Encouragements ────────────────────────────────────────── */
const ENCOURAGEMENTS = [
  "Thank you for sharing that 🌿","You're doing really well 💛",
  "That took courage — keep going 🌸","Every answer helps us understand you better ✨",
  "You're not alone in feeling this way 🤝","Almost there — you're doing great 🌼",
  "Thank you for being honest with yourself 💙","This is a brave step you're taking 🌱",
  "You matter, and so do your feelings 🧡",
];

/* ── Screening questions ───────────────────────────────────── */
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
const CHOICES = [
  {label:"Not at all",sub:"Hasn't really happened",value:0,color:C.sage},
  {label:"A few days",sub:"Once in a while",value:1,color:C.sky},
  {label:"More than half the days",sub:"Quite often",value:2,color:C.amber},
  {label:"Nearly every day",sub:"Almost always",value:3,color:C.peach},
];

/* ── FAQ data — smart Q&A replacing the live chat ─────────── */
const BASE_FAQS = [
  {
    q:"What does my score mean?",
    icon:"📊",
    a:(p,g)=>{
      const dl=p<=4?"minimal":p<=9?"mild":p<=14?"moderate":p<=19?"moderately severe":"severe";
      const al=g<=4?"minimal":g<=9?"mild":g<=14?"moderate":"severe";
      return `Your PHQ-9 score of ${p}/27 suggests ${dl} depression symptoms, and your GAD-7 score of ${g}/21 suggests ${al} anxiety symptoms.\n\nThese scores are a snapshot of how you've been feeling over the last two weeks — not a permanent label. Many people's scores improve significantly with the right support and self-care.\n\nThink of this as a starting point for a conversation with a doctor, not a diagnosis.`;
    }
  },
  {
    q:"Is this a diagnosis?",
    icon:"🩺",
    a:()=>`No — ManaScreen is a wellness screening tool, not a clinical diagnosis.\n\nThe PHQ-9 and GAD-7 are validated questionnaires used by doctors around the world to identify people who may benefit from further evaluation. A positive screen means you're worth looking into further — not that something is definitely wrong.\n\nOnly a qualified psychiatrist or clinical psychologist can make a formal diagnosis after a full assessment.`
  },
  {
    q:"Should I see a psychiatrist?",
    icon:"🤝",
    a:(p,g)=>{
      if(p>=15||g>=15) return `Based on your scores, we would strongly encourage you to speak to a psychiatrist or psychologist as soon as you can.\n\nYour scores suggest significant symptoms that are likely affecting your daily life. The earlier you reach out, the faster things can improve. You don't have to be in crisis to deserve professional support.\n\nA good first step: speak to your family doctor or GP, who can refer you to a specialist.`;
      if(p>=10||g>=10) return `Yes — with scores like yours, speaking to a mental health professional would be really beneficial.\n\nYou could start with your family doctor (GP) who can assess you and refer you if needed, or go directly to a psychiatrist or clinical psychologist.\n\nYou don't need to wait until things feel "bad enough." If your daily life is being affected, that's reason enough to reach out.`;
      return `Your scores suggest mild symptoms. You may not need a psychiatrist right away, but it's worth monitoring how you feel.\n\nIf symptoms persist for more than 2–3 weeks, or begin affecting your work, relationships, or sleep — please do speak to a doctor.\n\nIn the meantime, the exercises in this app, regular self-care, and talking to someone you trust can all help.`;
    }
  },
  {
    q:"How do I tell my family?",
    icon:"👨‍👩‍👧",
    a:()=>`Telling family about mental health struggles can feel scary — especially in Indian families where stigma can run deep. Here are some gentle ways to start:\n\n• Choose a calm moment — not during a conflict or when others are stressed\n• Start small: "I've been feeling really exhausted and low lately"\n• You don't have to explain everything at once\n• Show them this app and your results if words feel hard\n• Ask for one specific thing: "I'd just like you to listen"\n\nIf direct conversation feels impossible, consider writing a short letter or message first. Many families, once they understand, become the greatest source of support.`
  },
  {
    q:"What can I do to feel better today?",
    icon:"🌱",
    a:(p,g)=>{
      const tips=[];
      if(g>=5) tips.push("Try the Box Breathing exercise in this app — just 4 minutes can calm your nervous system","Step outside for even 10 minutes — natural light and movement both reduce anxiety quickly");
      if(p>=5) tips.push("Do one small thing you used to enjoy — even for 5 minutes. Don't wait until you 'feel like it'","Write down 3 tiny things that weren't terrible today — this gently trains your brain away from negativity bias");
      tips.push("Drink a full glass of water and eat something if you haven't","Text or call one person you trust — connection is medicine","Be kind to yourself. You completed this assessment. That took courage.");
      return `Here are some things that can genuinely help right now:\n\n${tips.map(t=>`• ${t}`).join("\n")}\n\nRemember: you don't have to feel completely better today. Small steps count.`;
    }
  },
  {
    q:"Will I need medication?",
    icon:"💊",
    a:()=>`That's entirely up to you and your doctor — medication is one option, not an obligation.\n\nFor mild symptoms, therapy (especially CBT — Cognitive Behavioural Therapy) and lifestyle changes are often recommended first.\n\nFor moderate to severe symptoms, medication combined with therapy tends to work best for most people. Modern antidepressants and anti-anxiety medications are safe, non-addictive, and effective for most people.\n\nMany people take medication for 6–12 months and then gradually stop with their doctor's guidance. The goal is always to help you get to a place where you can manage without it.`
  },
  {
    q:"Is what I'm feeling normal?",
    icon:"💙",
    a:(p,g)=>{
      const both=p>=5&&g>=5;
      return `Yes — absolutely. ${both?"Experiencing both depression and anxiety together is actually very common — they co-occur in about 50% of cases.":"What you're experiencing is far more common than you might think."}\n\nIn India, an estimated 1 in 7 people experience a mental health condition at some point in their lives. The pressure of family expectations, career, financial stress, and social comparison are real and take a real toll.\n\nFeeling this way does not mean you are weak, broken, or beyond help. It means you are human, and you are dealing with more than your nervous system can easily handle right now.\n\nYou reached out today. That matters enormously.`;
    }
  },
  {
    q:"How long will recovery take?",
    icon:"🌅",
    a:()=>`Recovery looks different for everyone, but here's what research generally shows:\n\n• Mild symptoms: Often improve within a few weeks with self-care and lifestyle changes\n• Moderate symptoms: Usually respond well to therapy within 8–16 sessions\n• Severe symptoms: May take 3–6 months with combined therapy and medication\n\nRecovery is rarely linear — there will be better days and harder days. That's normal.\n\nThe most important thing is to start. Every step forward, no matter how small, is real progress. People recover from depression and anxiety every single day — with the right support, you can too.`
  },
  {
    q:"Free mental health support in India",
    icon:"📞",
    a:()=>`Here are free, confidential resources available in India:\n\n📞 iCall (TISS): 9152987821\nMonday–Saturday, 8am–10pm. Counselling in English & Hindi.\n\n📞 Vandrevala Foundation: 1860-2662-345\n24/7, free, multilingual. Crisis and general support.\n\n📞 NIMHANS Helpline: 080-46110007\nNational Institute of Mental Health, Bengaluru.\n\n📞 Snehi: 044-24640050\nEmotional support and suicide prevention.\n\n🏥 Government option: Visit your nearest government hospital's psychiatry OPD — consultation is free or very low cost under Ayushman Bharat.\n\nYou deserve support. Please reach out.`
  },
  {
    q:"Can anxiety and depression be cured?",
    icon:"✨",
    a:()=>`Yes — the vast majority of people with depression and anxiety make a full or significant recovery with appropriate treatment.\n\n"Cured" might not be the right word — think of it more like "managed well." Many people reach a point where symptoms are minimal or absent, and they live full, meaningful lives.\n\nKey factors that help:\n• Early intervention (the sooner you seek help, the better)\n• Consistent treatment (attending therapy, taking medication as prescribed)\n• Lifestyle factors (sleep, exercise, nutrition, social connection)\n• Self-compassion and patience\n\nAnxiety and depression are medical conditions — just like diabetes or hypertension. They respond to treatment. You are not stuck.`
  },
];

/* ── Exercises data ────────────────────────────────────────── */
const ALL_EXERCISES = [
  {
    id:"box-breath",icon:"🫁",title:"Box Breathing",subtitle:"Calm your nervous system in 4 minutes",
    color:C.sky,bg:C.skyLight,tags:["anxiety","stress","restlessness"],
    why:"When we're anxious, our breathing becomes shallow and fast. Box breathing activates your parasympathetic nervous system — your body's natural 'rest and relax' mode — within minutes.",
    type:"breath",
    steps:[
      {label:"Breathe In",duration:4,instruction:"Slowly breathe in through your nose",color:C.sky},
      {label:"Hold",duration:4,instruction:"Hold gently — stay still and soft",color:C.lavender},
      {label:"Breathe Out",duration:4,instruction:"Slowly breathe out through your mouth",color:C.sage},
      {label:"Hold",duration:4,instruction:"Hold the empty breath — rest here",color:C.amber},
    ],
    rounds:4,
  },
  {
    id:"478-breath",icon:"🌬️",title:"4-7-8 Breathing",subtitle:"A natural tranquiliser for your mind",
    color:C.lavender,bg:C.lavenderLight,tags:["anxiety","sleep","panic"],
    why:"The 4-7-8 technique was developed by Dr. Andrew Weil. The extended exhale triggers a relaxation response, particularly helpful before sleep or during moments of panic.",
    type:"breath",
    steps:[
      {label:"Breathe In",duration:4,instruction:"Inhale quietly through your nose",color:C.sky},
      {label:"Hold",duration:7,instruction:"Hold your breath — be completely still",color:C.lavender},
      {label:"Breathe Out",duration:8,instruction:"Exhale completely through your mouth",color:C.sage},
    ],
    rounds:4,
  },
  {
    id:"54321",icon:"🌿",title:"5-4-3-2-1 Grounding",subtitle:"Anchor yourself to the present moment",
    color:C.sage,bg:C.sageLight,tags:["anxiety","panic","dissociation","depression"],
    why:"Grounding exercises interrupt anxious thought spirals by bringing your attention to the present through your five senses. A proven technique used in trauma therapy.",
    type:"grounding",
    senses:[
      {num:5,sense:"See",icon:"👁️",color:C.sky,prompt:"Look around you. Name 5 things you can see right now.",examples:"a window, a lamp, your hands, a plant, the ceiling"},
      {num:4,sense:"Touch",icon:"🤚",color:C.sage,prompt:"Notice 4 things you can physically feel or touch.",examples:"your feet on the floor, fabric on your skin, air temperature, a surface nearby"},
      {num:3,sense:"Hear",icon:"👂",color:C.lavender,prompt:"Listen carefully. What are 3 sounds you can hear?",examples:"traffic outside, a fan, your own breathing, distant voices"},
      {num:2,sense:"Smell",icon:"👃",color:C.amber,prompt:"Notice 2 things you can smell — or remember a scent you love.",examples:"fresh air, your clothes, food, a candle, rain"},
      {num:1,sense:"Taste",icon:"👅",color:C.peach,prompt:"Notice 1 thing you can taste right now.",examples:"a drink, toothpaste, the inside of your mouth"},
    ],
  },
  {
    id:"body-scan",icon:"🧘",title:"Body Scan Relaxation",subtitle:"Release tension you didn't know you were holding",
    color:C.teal,bg:C.tealLight,tags:["depression","anxiety","tension","sleep"],
    why:"Depression and anxiety both cause physical tension we often don't notice. A body scan helps you reconnect with your body and consciously release stored stress, part by part.",
    type:"bodyscan",
    parts:[
      {area:"Your feet & legs",icon:"🦶",instruction:"Close your eyes. Notice your feet. Are they tense? Let them soften and relax completely. Feel the weight of your legs."},
      {area:"Your belly & chest",icon:"🫀",instruction:"Bring awareness to your stomach. Let it be soft. Notice your chest rising and falling. You don't need to control it — just observe."},
      {area:"Your shoulders & arms",icon:"💪",instruction:"Notice if your shoulders are raised or tight. Let them drop. Let your arms feel heavy and warm."},
      {area:"Your neck & jaw",icon:"😌",instruction:"Your neck holds so much tension. Let it soften. Unclench your jaw — let your teeth part slightly. Feel the release."},
      {area:"Your whole face",icon:"🌸",instruction:"Relax your forehead, your eyes, your cheeks. Let your whole face become soft and still. You are safe right now."},
    ],
  },
  {
    id:"gratitude",icon:"🌻",title:"Gratitude Moments",subtitle:"Gently shift your mental lens",
    color:C.amber,bg:C.amberLight,tags:["depression","low-mood","hopelessness"],
    why:"Research shows that regularly noticing small positive things rewires neural pathways over time, reducing the negativity bias that depression creates. Even tiny moments count.",
    type:"reflect",
    prompts:[
      {q:"Name one small thing that went okay today — even something tiny.",icon:"🌱",example:"e.g. a warm drink, a moment of quiet, someone smiled at me"},
      {q:"Think of one person who has been kind to you recently.",icon:"🤝",example:"e.g. a family member, a colleague, a stranger who held a door"},
      {q:"Name one thing about your body you're grateful for today.",icon:"💙",example:"e.g. my hands work, I can breathe, my eyes can see"},
    ],
  },
  {
    id:"self-compassion",icon:"💛",title:"Self-Compassion Pause",subtitle:"Speak to yourself like a dear friend would",
    color:C.peach,bg:C.peachLight,tags:["depression","self-criticism","shame","guilt"],
    why:"People with depression often speak to themselves harshly. Dr. Kristin Neff's research shows that self-compassion — treating yourself as you would treat a dear friend — is a powerful antidote.",
    type:"reflect",
    prompts:[
      {q:"What would you say to a dear friend who was feeling exactly the way you feel right now?",icon:"🤗",example:"e.g. \"It's okay. You're doing your best. This will pass.\""},
      {q:"Can you offer that same gentleness to yourself — even just for this moment?",icon:"💛",example:"e.g. \"I am allowed to struggle. I deserve kindness too.\""},
      {q:"What is one thing you did today — however small — that shows you're trying?",icon:"🌸",example:"e.g. I got out of bed, I ate something, I reached out for help"},
    ],
  },
  {
    id:"progressive-relax",icon:"🌊",title:"Progressive Muscle Relaxation",subtitle:"Tense to release — melt away physical stress",
    color:C.teal,bg:C.tealLight,tags:["anxiety","tension","stress","sleep"],
    why:"PMR works by deliberately tensing then releasing muscle groups, teaching your body to distinguish between tension and relaxation. Clinically proven to reduce anxiety and improve sleep.",
    type:"pmr",
    groups:[
      {area:"Hands & forearms",icon:"✊",tense:"Make tight fists with both hands. Hold for 5 seconds.",release:"Let your hands fall open. Feel the warmth and tingling spread through your fingers."},
      {area:"Shoulders",icon:"🤷",tense:"Raise your shoulders up to your ears as high as they go. Hold for 5 seconds.",release:"Drop them completely. Feel the tension dissolve down your back."},
      {area:"Face & jaw",icon:"😬",tense:"Scrunch your whole face tightly — eyes, nose, jaw. Hold for 5 seconds.",release:"Let everything release at once. Feel your face become soft and smooth."},
      {area:"Stomach",icon:"🫃",tense:"Tighten your stomach muscles as if bracing for something. Hold for 5 seconds.",release:"Let your belly go completely soft. Breathe into it gently."},
      {area:"Legs & feet",icon:"🦵",tense:"Press your feet into the floor and tighten your thigh muscles. Hold for 5 seconds.",release:"Let your legs go heavy and still. Feel the release travel up from your feet."},
    ],
  },
];

function getRecommendedExercises(phq9,gad7){
  const isAnxious=gad7>=5, isDepressed=phq9>=5;
  if(isAnxious&&isDepressed) return ["box-breath","54321","self-compassion","body-scan"];
  if(isAnxious)              return ["box-breath","478-breath","54321","progressive-relax"];
  if(isDepressed)            return ["gratitude","self-compassion","body-scan","54321"];
  return ["box-breath","gratitude","54321"];
}

/* ── Shared UI ─────────────────────────────────────────────── */
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

/* ── FAQ Screen (replaces live AI chat) ────────────────────── */
function FAQScreen({phq9,gad7,onBack}){
  const [open,setOpen]=useState(null);
  const faqs=BASE_FAQS;

  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.peach,cursor:"pointer",fontSize:15,fontWeight:800,marginBottom:20,padding:0,fontFamily:FB,display:"flex",alignItems:"center",gap:6}}>← Back</button>
      <Fade>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:10}}>💬</div>
          <Pill color={C.sky}>Common Questions</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 8px"}}>Questions & Answers</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.7}}>Answers to the questions most people have after completing their assessment.</p>
        </div>
      </Fade>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {faqs.map((faq,i)=>{
          const isOpen=open===i;
          const answer=typeof faq.a==="function"?faq.a(phq9,gad7):faq.a;
          return(
            <Fade key={i} delay={i*60}>
              <div style={{borderRadius:18,border:`1.5px solid ${isOpen?C.sky:C.border}`,background:isOpen?C.skyLight:C.card,transition:"all 0.25s ease",overflow:"hidden",boxShadow:isOpen?"0 4px 16px rgba(91,143,201,0.12)":"none"}}>
                <button onClick={()=>setOpen(isOpen?null:i)} style={{width:"100%",display:"flex",alignItems:"center",gap:14,padding:"18px 20px",background:"none",border:"none",cursor:"pointer",textAlign:"left",fontFamily:FB}}>
                  <span style={{fontSize:24,flexShrink:0}}>{faq.icon}</span>
                  <span style={{color:C.text,fontWeight:700,fontSize:15,flex:1}}>{faq.q}</span>
                  <span style={{color:C.textMuted,fontSize:20,transform:isOpen?"rotate(90deg)":"rotate(0deg)",transition:"transform 0.25s ease",flexShrink:0}}>›</span>
                </button>
                {isOpen&&(
                  <div style={{padding:"0 20px 20px 58px"}}>
                    {answer.split("\n").map((line,j)=>{
                      const isBullet=line.startsWith("•");
                      const isEmpty=line==="";
                      const isPhone=line.match(/^📞/);
                      const isHosp=line.match(/^🏥/);
                      if(isEmpty) return <div key={j} style={{height:6}}/>;
                      return <p key={j} style={{color:isPhone||isHosp?C.sky:C.textMid,fontSize:14,lineHeight:1.8,marginBottom:2,fontWeight:isPhone?700:400}}>{line}</p>;
                    })}
                  </div>
                )}
              </div>
            </Fade>
          );
        })}
      </div>

      <Fade delay={600}>
        <div style={{background:C.roseLight,border:`1.5px solid ${C.rose}44`,borderRadius:18,padding:"18px 20px",marginTop:24}}>
          <div style={{color:C.rose,fontWeight:800,fontSize:14,marginBottom:6}}>💙 Need to talk to someone right now?</div>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.75}}>
            iCall: <strong>9152987821</strong><br/>
            Vandrevala (24/7): <strong>1860-2662-345</strong><br/>
            NIMHANS: <strong>080-46110007</strong>
          </p>
        </div>
      </Fade>
    </div>
  );
}

/* ── Breathing exercise ────────────────────────────────────── */
function BreathingExercise({exercise,onDone}){
  const [phase,setPhase]=useState(0);
  const [count,setCount]=useState(exercise.steps[0].duration);
  const [round,setRound]=useState(1);
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);
  const [scale,setScale]=useState(1);
  const intervalRef=useRef(null);
  const totalRounds=exercise.rounds||4;
  const steps=exercise.steps;

  const tick=useCallback(()=>{
    setCount(c=>{
      if(c>1) return c-1;
      setPhase(p=>{
        const next=(p+1)%steps.length;
        if(next===0){
          setRound(r=>{
            if(r>=totalRounds){setRunning(false);setDone(true);return r;}
            return r+1;
          });
        }
        setCount(steps[next].duration);
        setScale(steps[next].label==="Breathe In"?1.4:steps[next].label==="Breathe Out"?0.85:steps[p].label==="Breathe In"?1.4:0.9);
        return next;
      });
      return steps[(phase+1)%steps.length].duration;
    });
  },[steps,phase,totalRounds]);

  useEffect(()=>{
    if(running){intervalRef.current=setInterval(tick,1000);}
    else clearInterval(intervalRef.current);
    return()=>clearInterval(intervalRef.current);
  },[running,tick]);

  useEffect(()=>{setScale(steps[phase].label==="Breathe In"?1.4:steps[phase].label==="Breathe Out"?0.85:0.95);},[phase]);

  const cur=steps[phase];
  if(done) return(
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{fontSize:64,marginBottom:16}}>✨</div>
      <h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:10}}>Beautifully done</h3>
      <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28}}>You completed {totalRounds} rounds of {exercise.title}. Notice how you feel — even a small shift counts.</p>
      <WarmButton onClick={onDone}>← Back to exercises</WarmButton>
    </div>
  );

  return(
    <div style={{textAlign:"center"}}>
      <div style={{marginBottom:24}}>
        <div style={{color:C.textSoft,fontSize:13,marginBottom:4}}>Round {round} of {totalRounds}</div>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${((round-1)/totalRounds)*100}%`,background:cur.color,borderRadius:3,transition:"width 0.5s ease"}}/>
        </div>
      </div>
      <div style={{position:"relative",width:200,height:200,margin:"0 auto 28px",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",background:cur.color+"18",transform:`scale(${scale})`,transition:`transform ${cur.duration*0.9}s ease`}}/>
        <div style={{position:"absolute",inset:16,borderRadius:"50%",background:cur.color+"28",transform:`scale(${scale*0.9})`,transition:`transform ${cur.duration*0.9}s ease`}}/>
        <div style={{position:"relative",zIndex:1,textAlign:"center"}}>
          <div style={{color:cur.color,fontWeight:800,fontSize:36,lineHeight:1}}>{count}</div>
          <div style={{color:cur.color,fontWeight:700,fontSize:14,marginTop:4}}>{cur.label}</div>
        </div>
      </div>
      <p style={{fontFamily:FD,color:C.textMid,fontSize:17,lineHeight:1.7,marginBottom:28,fontStyle:"italic"}}>"{cur.instruction}"</p>
      {!running?(
        <WarmButton onClick={()=>setRunning(true)} style={{background:cur.color,borderColor:cur.color}}>{round===1?"Begin breathing exercise":"Resume"}</WarmButton>
      ):(
        <button onClick={()=>setRunning(false)} style={{background:"none",border:`2px solid ${C.border}`,borderRadius:18,padding:"14px 28px",color:C.textSoft,fontSize:15,cursor:"pointer",fontFamily:FB,fontWeight:700,width:"100%"}}>Pause</button>
      )}
    </div>
  );
}

/* ── Grounding exercise ────────────────────────────────────── */
function GroundingExercise({exercise,onDone}){
  const [step,setStep]=useState(0);
  const [input,setInput]=useState("");
  const [saved,setSaved]=useState([]);
  const [done,setDone]=useState(false);
  const senses=exercise.senses;
  if(done) return(
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{fontSize:64,marginBottom:16}}>🌿</div>
      <h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:10}}>You're grounded</h3>
      <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:20}}>You've completed the 5-4-3-2-1 exercise. Notice how you feel now.</p>
      {saved.map((s,i)=>(
        <div key={i} style={{textAlign:"left",padding:"10px 0",borderBottom:`1px solid ${C.border}`,display:"flex",gap:12}}>
          <span style={{fontSize:18}}>{senses[i].icon}</span>
          <div><div style={{color:C.textSoft,fontSize:12,fontWeight:700}}>{senses[i].sense}</div><div style={{color:C.text,fontSize:14}}>{s}</div></div>
        </div>
      ))}
      <div style={{marginTop:24}}><WarmButton onClick={onDone}>← Back to exercises</WarmButton></div>
    </div>
  );
  const cur=senses[step];
  return(
    <div>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <Pill color={cur.color}>{cur.num} things to {cur.sense}</Pill>
          <span style={{color:C.textMuted,fontSize:13}}>{step+1} of {senses.length}</span>
        </div>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(step/senses.length)*100}%`,background:cur.color,borderRadius:3,transition:"width 0.4s ease"}}/>
        </div>
      </div>
      <Card style={{background:cur.color+"0f",border:`1.5px solid ${cur.color}33`,textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:48,marginBottom:12}}>{cur.icon}</div>
        <p style={{fontFamily:FD,color:C.text,fontSize:18,lineHeight:1.65,fontWeight:600,marginBottom:8}}>{cur.prompt}</p>
        <p style={{color:C.textSoft,fontSize:13,fontStyle:"italic"}}>{cur.examples}</p>
      </Card>
      <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Type what you notice... (or skip)"
        style={{width:"100%",minHeight:90,padding:"14px 16px",borderRadius:16,border:`1.5px solid ${C.border}`,background:C.card,color:C.text,fontSize:15,fontFamily:FB,outline:"none",resize:"none",marginBottom:14,lineHeight:1.6}}/>
      <WarmButton onClick={()=>{const ns=[...saved,input||"(skipped)"];setSaved(ns);setInput("");if(step+1<senses.length)setStep(step+1);else setDone(true);}} style={{background:cur.color,borderColor:cur.color}}>
        {step+1<senses.length?`Next — ${senses[step+1].sense} →`:"Finish exercise ✓"}
      </WarmButton>
    </div>
  );
}

/* ── Body scan ─────────────────────────────────────────────── */
function BodyScanExercise({exercise,onDone}){
  const [step,setStep]=useState(-1);
  const [done,setDone]=useState(false);
  const parts=exercise.parts;
  if(step===-1) return(
    <div style={{textAlign:"center",padding:"16px 0"}}>
      <div style={{fontSize:56,marginBottom:16}}>🧘</div>
      <h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:12}}>Find a comfortable position</h3>
      <p style={{color:C.textMid,fontSize:15,lineHeight:1.8,marginBottom:28}}>Sit or lie down somewhere you won't be disturbed. Close your eyes if comfortable. We'll slowly move through your body, releasing tension as we go.</p>
      <WarmButton variant="teal" onClick={()=>setStep(0)}>I'm ready 🌿</WarmButton>
    </div>
  );
  if(done) return(
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{fontSize:64,marginBottom:16}}>🌊</div>
      <h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:10}}>Wonderfully done</h3>
      <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28}}>You've scanned and released tension through your whole body. You've done something kind for yourself today.</p>
      <WarmButton onClick={onDone}>← Back to exercises</WarmButton>
    </div>
  );
  const cur=parts[step];
  return(
    <div>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <Pill color={C.teal}>Body Scan</Pill>
          <span style={{color:C.textMuted,fontSize:13}}>{step+1} of {parts.length}</span>
        </div>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(step/parts.length)*100}%`,background:C.teal,borderRadius:3,transition:"width 0.5s ease"}}/>
        </div>
      </div>
      <Card style={{background:C.tealLight,border:`1.5px solid ${C.teal}44`,textAlign:"center",marginBottom:24}}>
        <div style={{fontSize:52,marginBottom:12}}>{cur.icon}</div>
        <h3 style={{fontFamily:FD,color:C.text,fontSize:19,marginBottom:14}}>{cur.area}</h3>
        <p style={{color:C.textMid,fontSize:16,lineHeight:1.85,fontStyle:"italic",fontFamily:FD}}>{cur.instruction}</p>
      </Card>
      <p style={{color:C.textSoft,fontSize:14,textAlign:"center",marginBottom:20}}>Take as long as you need. Move on only when you feel ready.</p>
      <WarmButton variant="teal" onClick={()=>{if(step+1<parts.length)setStep(step+1);else setDone(true);}}>
        {step+1<parts.length?`Move to ${parts[step+1].area} →`:"Complete body scan ✓"}
      </WarmButton>
    </div>
  );
}

/* ── PMR ───────────────────────────────────────────────────── */
function PMRExercise({exercise,onDone}){
  const [step,setStep]=useState(-1);
  const [phase,setPhase]=useState("tense");
  const [count,setCount]=useState(5);
  const [done,setDone]=useState(false);
  const intervalRef=useRef(null);
  const groups=exercise.groups;
  useEffect(()=>{
    if(step>=0&&phase==="tense"){
      setCount(5);
      intervalRef.current=setInterval(()=>{
        setCount(c=>{if(c<=1){clearInterval(intervalRef.current);setPhase("release");return 5;}return c-1;});
      },1000);
    }
    return()=>clearInterval(intervalRef.current);
  },[step,phase]);
  if(step===-1) return(
    <div style={{textAlign:"center",padding:"16px 0"}}>
      <div style={{fontSize:56,marginBottom:16}}>🌊</div>
      <h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:12}}>Progressive Muscle Relaxation</h3>
      <p style={{color:C.textMid,fontSize:15,lineHeight:1.8,marginBottom:24}}>We'll tense then release 5 muscle groups, one at a time. The contrast between tension and release teaches your body to deeply relax.</p>
      <WarmButton variant="teal" onClick={()=>setStep(0)}>Start →</WarmButton>
    </div>
  );
  if(done) return(
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{fontSize:64,marginBottom:16}}>✨</div>
      <h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:10}}>Your body thanks you</h3>
      <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:28}}>You've worked through all 5 muscle groups. Physical tension and emotional stress are deeply connected — by releasing one, you ease the other.</p>
      <WarmButton onClick={onDone}>← Back to exercises</WarmButton>
    </div>
  );
  const cur=groups[step];
  return(
    <div>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <Pill color={C.teal}>Muscle Relaxation</Pill>
          <span style={{color:C.textMuted,fontSize:13}}>{step+1} of {groups.length}</span>
        </div>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(step/groups.length)*100}%`,background:C.teal,borderRadius:3,transition:"width 0.5s"}}/>
        </div>
      </div>
      <Card style={{background:phase==="tense"?C.amberLight:C.tealLight,border:`1.5px solid ${phase==="tense"?C.amber:C.teal}44`,textAlign:"center",marginBottom:24,transition:"background 0.5s"}}>
        <div style={{fontSize:52,marginBottom:10}}>{cur.icon}</div>
        <h3 style={{fontFamily:FD,color:C.text,fontSize:18,marginBottom:10}}>{cur.area}</h3>
        {phase==="tense"?(
          <>
            <div style={{background:C.amber+"22",color:C.amber,fontWeight:800,fontSize:13,padding:"4px 14px",borderRadius:20,display:"inline-block",marginBottom:12}}>✊ TENSE — {count}s</div>
            <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,fontStyle:"italic",fontFamily:FD}}>{cur.tense}</p>
          </>
        ):(
          <>
            <div style={{background:C.teal+"22",color:C.teal,fontWeight:800,fontSize:13,padding:"4px 14px",borderRadius:20,display:"inline-block",marginBottom:12}}>🌊 RELEASE & RELAX</div>
            <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,fontStyle:"italic",fontFamily:FD}}>{cur.release}</p>
          </>
        )}
      </Card>
      {phase==="release"&&(
        <WarmButton variant="teal" onClick={()=>{setPhase("tense");if(step+1<groups.length)setStep(step+1);else setDone(true);}}>
          {step+1<groups.length?`Next — ${groups[step+1].area} →`:"Finish exercise ✓"}
        </WarmButton>
      )}
    </div>
  );
}

/* ── Reflect exercise ──────────────────────────────────────── */
function ReflectExercise({exercise,onDone}){
  const [step,setStep]=useState(0);
  const [inputs,setInputs]=useState([]);
  const [input,setInput]=useState("");
  const [done,setDone]=useState(false);
  const prompts=exercise.prompts;
  if(done) return(
    <div style={{textAlign:"center",padding:"32px 0"}}>
      <div style={{fontSize:64,marginBottom:16}}>{exercise.icon}</div>
      <h3 style={{fontFamily:FD,fontSize:22,color:C.text,marginBottom:10}}>Thank you for that</h3>
      <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:20}}>These reflections belong to you — a reminder that even on hard days, small good things exist.</p>
      {inputs.map((s,i)=>(
        <div key={i} style={{textAlign:"left",padding:"12px 0",borderBottom:`1px solid ${C.border}`,display:"flex",gap:12}}>
          <span style={{fontSize:20}}>{prompts[i].icon}</span>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.65}}>{s||"(skipped)"}</p>
        </div>
      ))}
      <div style={{marginTop:24}}><WarmButton onClick={onDone}>← Back to exercises</WarmButton></div>
    </div>
  );
  const cur=prompts[step];
  return(
    <div>
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <Pill color={exercise.color}>{exercise.title}</Pill>
          <span style={{color:C.textMuted,fontSize:13}}>{step+1} of {prompts.length}</span>
        </div>
        <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${(step/prompts.length)*100}%`,background:exercise.color,borderRadius:3,transition:"width 0.4s"}}/>
        </div>
      </div>
      <Card style={{background:exercise.color+"0f",border:`1.5px solid ${exercise.color}33`,textAlign:"center",marginBottom:20}}>
        <div style={{fontSize:44,marginBottom:12}}>{cur.icon}</div>
        <p style={{fontFamily:FD,color:C.text,fontSize:18,lineHeight:1.7,fontWeight:600,marginBottom:8}}>{cur.q}</p>
        <p style={{color:C.textSoft,fontSize:13,fontStyle:"italic"}}>{cur.example}</p>
      </Card>
      <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Write freely — this is just for you..."
        style={{width:"100%",minHeight:100,padding:"14px 16px",borderRadius:16,border:`1.5px solid ${C.border}`,background:C.card,color:C.text,fontSize:15,fontFamily:FB,outline:"none",resize:"none",marginBottom:14,lineHeight:1.6}}/>
      <WarmButton onClick={()=>{const ni=[...inputs,input];setInputs(ni);setInput("");if(step+1<prompts.length)setStep(step+1);else setDone(true);}} style={{background:exercise.color,borderColor:exercise.color}}>
        {step+1<prompts.length?"Next reflection →":"Finish ✓"}
      </WarmButton>
    </div>
  );
}

/* ── Exercises hub ─────────────────────────────────────────── */
function ExercisesScreen({phq9,gad7,onDone}){
  const [active,setActive]=useState(null);
  const recIds=getRecommendedExercises(phq9,gad7);
  const recommended=ALL_EXERCISES.filter(e=>recIds.includes(e.id));
  const others=ALL_EXERCISES.filter(e=>!recIds.includes(e.id));

  if(active){
    const ex=ALL_EXERCISES.find(e=>e.id===active);
    return(
      <div>
        <button onClick={()=>setActive(null)} style={{background:"none",border:"none",color:C.peach,cursor:"pointer",fontSize:15,fontWeight:800,marginBottom:24,padding:0,fontFamily:FB,display:"flex",alignItems:"center",gap:6}}>← Back to exercises</button>
        <Fade>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:44,marginBottom:8}}>{ex.icon}</div>
            <h2 style={{fontFamily:FD,fontSize:24,color:C.text,marginBottom:6}}>{ex.title}</h2>
            <p style={{color:C.textSoft,fontSize:14,marginBottom:14}}>{ex.subtitle}</p>
            <div style={{background:ex.bg,border:`1.5px solid ${ex.color}33`,borderRadius:14,padding:"14px 16px",marginBottom:20}}>
              <div style={{color:ex.color,fontWeight:800,fontSize:13,marginBottom:5}}>💡 Why this helps</div>
              <p style={{color:C.textMid,fontSize:14,lineHeight:1.7}}>{ex.why}</p>
            </div>
          </div>
          {ex.type==="breath"    && <BreathingExercise exercise={ex} onDone={()=>setActive(null)}/>}
          {ex.type==="grounding" && <GroundingExercise exercise={ex} onDone={()=>setActive(null)}/>}
          {ex.type==="bodyscan"  && <BodyScanExercise  exercise={ex} onDone={()=>setActive(null)}/>}
          {ex.type==="pmr"       && <PMRExercise       exercise={ex} onDone={()=>setActive(null)}/>}
          {ex.type==="reflect"   && <ReflectExercise   exercise={ex} onDone={()=>setActive(null)}/>}
        </Fade>
      </div>
    );
  }

  const ExCard=({ex,i,rec})=>(
    <Fade delay={i*80}>
      <button onClick={()=>setActive(ex.id)} style={{display:"flex",alignItems:"center",gap:14,padding:"18px 20px",background:C.card,border:`1.5px solid ${C.border}`,borderRadius:20,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s",boxShadow:"0 2px 12px rgba(180,140,120,0.05)"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=ex.color;e.currentTarget.style.background=ex.color+"0c";}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}>
        <div style={{width:52,height:52,borderRadius:15,background:ex.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{ex.icon}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
            <span style={{color:C.text,fontWeight:800,fontSize:15}}>{ex.title}</span>
            {rec&&<span style={{background:ex.color+"22",color:ex.color,fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:10}}>FOR YOU</span>}
          </div>
          <div style={{color:C.textSoft,fontSize:13}}>{ex.subtitle}</div>
        </div>
        <span style={{color:C.textMuted,fontSize:22,marginLeft:4}}>›</span>
      </button>
    </Fade>
  );

  return(
    <div>
      <Fade>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:52,marginBottom:10}}>🌿</div>
          <Pill color={C.sage}>Before you go</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 10px"}}>Try a calming exercise</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.75}}>Evidence-based exercises to help you feel a little better right now.</p>
        </div>
      </Fade>
      <Fade delay={150}>
        <div style={{color:C.textSoft,fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>✨ Recommended for you</div>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
          {recommended.map((ex,i)=><ExCard key={ex.id} ex={ex} i={i} rec={true}/>)}
        </div>
      </Fade>
      {others.length>0&&(
        <Fade delay={300}>
          <div style={{color:C.textSoft,fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:1.5,marginBottom:12}}>All exercises</div>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
            {others.map((ex,i)=><ExCard key={ex.id} ex={ex} i={i} rec={false}/>)}
          </div>
        </Fade>
      )}
      <Fade delay={400}>
        <div style={{background:C.sageLight,border:`1.5px solid ${C.sage}44`,borderRadius:18,padding:"18px 20px",marginBottom:24}}>
          <div style={{color:C.sage,fontWeight:800,fontSize:14,marginBottom:6}}>🌿 A gentle reminder</div>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.75}}>These exercises are tools to help you cope — not substitutes for professional care. Daily practice brings the most benefit.</p>
        </div>
        <WarmButton onClick={onDone}>Continue to next steps →</WarmButton>
      </Fade>
    </div>
  );
}

/* ── Welcome ───────────────────────────────────────────────── */
function WelcomeScreen({onNext}){
  return(
    <div style={{textAlign:"center",paddingTop:24}}>
      <Fade>
        <div style={{fontSize:70,marginBottom:10,lineHeight:1}}>🌸</div>
        <h1 style={{fontFamily:FD,fontSize:38,fontWeight:700,color:C.text,marginBottom:6}}>ManaScreen</h1>
        <p style={{color:C.textSoft,fontSize:13,letterSpacing:2.5,textTransform:"uppercase",fontWeight:700,marginBottom:30}}>Your mental wellness companion</p>
      </Fade>
      <Fade delay={180}>
        <Card style={{marginBottom:18,background:C.peachLight,border:`1.5px solid ${C.peach}33`}}>
          <p style={{fontFamily:FD,color:C.textMid,fontSize:16,lineHeight:1.85,fontStyle:"italic"}}>"You've taken the first step just by being here. This is a safe, private space — just for you."</p>
        </Card>
      </Fade>
      <Fade delay={300}>
        <div style={{display:"flex",flexDirection:"column",gap:11,marginBottom:22}}>
          {[[C.sage,"🔒","Completely private","Nothing is saved or shared"],[C.sky,"⏱️","Just 5–7 minutes","Go at your own pace"],[C.peach,"💬","One question at a time","Gentle and never overwhelming"],[C.amber,"🌿","Not a diagnosis","A first step to understanding yourself"]].map(([col,icon,title,sub])=>(
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
          <div style={{color:C.textMid,fontSize:14,lineHeight:1.75}}>iCall: <strong>9152987821</strong> &nbsp;·&nbsp; Vandrevala: <strong>1860-2662-345</strong> (24/7)</div>
        </div>
        <WarmButton onClick={onNext}>I'm ready to begin 🌱</WarmButton>
        <p style={{color:C.textMuted,fontSize:12,marginTop:14,lineHeight:1.6}}>By continuing, you acknowledge this is a wellness tool, not a clinical diagnosis.</p>
      </Fade>
    </div>
  );
}

/* ── Who ───────────────────────────────────────────────────── */
function WhoScreen({onSelect}){
  const opts=[
    {icon:"🙋",label:"I'm checking in on myself",sub:"For my own wellbeing",val:"self"},
    {icon:"👨‍👩‍👧",label:"I'm a family member or caregiver",sub:"Checking in for someone I love",val:"caregiver"},
    {icon:"🩺",label:"I already see a specialist",sub:"Tracking between visits",val:"existing"},
  ];
  return(
    <div>
      <Fade>
        <Pill color={C.peach}>Step 1 of 4</Pill>
        <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 8px"}}>Hello! Who is this for today?</h2>
        <p style={{color:C.textMid,fontSize:15,lineHeight:1.75,marginBottom:26}}>There's no wrong answer.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {opts.map((o,i)=>(
          <Fade key={o.val} delay={i*100}>
            <button onClick={()=>onSelect(o.val)} style={{display:"flex",alignItems:"center",gap:16,padding:"20px",background:C.card,border:`2px solid ${C.border}`,borderRadius:20,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.peach;e.currentTarget.style.background=C.peachLight;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}>
              <span style={{fontSize:32}}>{o.icon}</span>
              <div><div style={{color:C.text,fontWeight:800,fontSize:15}}>{o.label}</div><div style={{color:C.textSoft,fontSize:13,marginTop:3}}>{o.sub}</div></div>
              <span style={{marginLeft:"auto",color:C.textMuted,fontSize:22}}>›</span>
            </button>
          </Fade>
        ))}
      </div>
    </div>
  );
}

/* ── Intro ─────────────────────────────────────────────────── */
function IntroScreen({who,onNext}){
  return(
    <div>
      <Fade>
        <Pill color={C.sage}>Step 2 of 4</Pill>
        <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 12px"}}>Before we get started</h2>
        <p style={{color:C.textMid,fontSize:15,lineHeight:1.85,marginBottom:24}}>
          {who==="caregiver"?"We'll ask about what you've noticed in the person you care for over the last 2 weeks. Your compassion in doing this matters enormously.":"We'll gently ask how you've been feeling over the last 2 weeks. There are no right or wrong answers — just honest ones."}
        </p>
      </Fade>
      <Fade delay={200}>
        <Card style={{marginBottom:22}}>
          <div style={{color:C.textSoft,fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:1.5,marginBottom:16}}>What we'll cover</div>
          {[[C.sky,"PHQ-9","Depression screening","9 gentle questions"],[C.sage,"GAD-7","Anxiety screening","7 questions"]].map(([col,code,label,desc])=>(
            <div key={code} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{width:46,height:46,borderRadius:14,background:col+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:col,fontWeight:800,fontSize:12}}>{code}</span></div>
              <div><div style={{color:C.text,fontWeight:700,fontSize:14}}>{label}</div><div style={{color:C.textSoft,fontSize:13,marginTop:2}}>{desc}</div></div>
            </div>
          ))}
          <p style={{color:C.textMuted,fontSize:13,marginTop:14}}>Clinically validated tools used by doctors worldwide.</p>
        </Card>
      </Fade>
      <Fade delay={350}><WarmButton onClick={onNext}>Let's begin 💛</WarmButton></Fade>
    </div>
  );
}

/* ── Question screen ───────────────────────────────────────── */
function QuestionScreen({questions,code,color,bgColor,sectionTitle,onComplete}){
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
        else onComplete(na.reduce((a,b)=>a+b,0));
      },300);
    },900);
  };

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
            <p style={{color:C.textMid,fontSize:13,lineHeight:1.65}}>Please answer honestly. If you're struggling, help is a call away — iCall: <strong>9152987821</strong></p>
          </div>
        </Fade>
      )}
      <div style={{opacity:visible?1:0,transform:visible?"translateY(0)":"translateY(10px)",transition:"opacity 0.35s ease,transform 0.35s ease"}}>
        <Card style={{marginBottom:22,background:bgColor,border:`1.5px solid ${color}33`,textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:10}}>{questions[current].emoji}</div>
          <p style={{color:C.textSoft,fontSize:13,marginBottom:10}}>Over the <strong>last 2 weeks</strong>, how often have you been experiencing…</p>
          <p style={{fontFamily:FD,color:C.text,fontSize:19,lineHeight:1.65,fontWeight:600}}>{questions[current].q}</p>
        </Card>
      </div>
      <div style={{textAlign:"center",height:30,marginBottom:14,opacity:showEncourage?1:0,transform:showEncourage?"translateY(0)":"translateY(-6px)",transition:"all 0.35s ease"}}>
        <span style={{color:C.sage,fontWeight:800,fontSize:15}}>{encourageMsg}</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {CHOICES.map(ch=>(
          <button key={ch.value} onClick={()=>handleChoice(ch.value)} style={{display:"flex",alignItems:"center",gap:14,padding:"15px 18px",borderRadius:16,border:`2px solid ${selected===ch.value?ch.color:C.border}`,background:selected===ch.value?ch.color+"1a":C.card,cursor:selected!==null?"default":"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.18s ease",opacity:selected!==null&&selected!==ch.value?0.4:1,boxShadow:selected===ch.value?`0 0 0 3px ${ch.color}33`:"none"}}
            onMouseEnter={e=>{if(selected===null){e.currentTarget.style.borderColor=ch.color;e.currentTarget.style.background=ch.color+"11";}}}
            onMouseLeave={e=>{if(selected!==ch.value){e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}}>
            <div style={{width:38,height:38,borderRadius:11,background:ch.color+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:ch.color,fontWeight:800,fontSize:14}}>{ch.value}</span></div>
            <div><div style={{color:C.text,fontWeight:700,fontSize:15}}>{ch.label}</div><div style={{color:C.textSoft,fontSize:12,marginTop:2}}>{ch.sub}</div></div>
            {selected===ch.value&&<span style={{marginLeft:"auto",color:ch.color,fontSize:20}}>✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Bridge ────────────────────────────────────────────────── */
function SectionBridge({onNext}){
  return(
    <div style={{textAlign:"center",paddingTop:32}}>
      <Fade>
        <div style={{fontSize:64,marginBottom:16}}>🌿</div>
        <h2 style={{fontFamily:FD,fontSize:26,color:C.text,marginBottom:14}}>You're halfway there!</h2>
        <p style={{color:C.textMid,fontSize:15,lineHeight:1.85,marginBottom:26}}>You've finished the depression section. You're doing wonderfully. Next: {GAD7.length} short questions about anxiety and worry.</p>
        <div style={{background:C.sageLight,border:`1.5px solid ${C.sage}44`,borderRadius:18,padding:"20px 22px",marginBottom:32}}>
          <p style={{color:C.sage,fontWeight:800,fontSize:15,marginBottom:8}}>🌬️ A quick breathing moment</p>
          <p style={{color:C.textMid,fontSize:14,lineHeight:1.8}}>Breathe in for 4 counts… Hold for 4… Breathe out for 4.<br/><br/>Ready whenever you are 🙏</p>
        </div>
        <WarmButton variant="sage" onClick={onNext}>Continue →</WarmButton>
      </Fade>
    </div>
  );
}

/* ── Result screen ─────────────────────────────────────────── */
function ResultScreen({phq9,gad7,who,onExercises,onFAQ,onLearn,onRetake}){
  const dep=phq9<=4?{label:"Minimal",color:C.sage,icon:"🌱",msg:"Your responses suggest very little sign of depression right now. Keep nurturing yourself."}
           :phq9<=9?{label:"Mild",color:C.sky,icon:"🌤️",msg:"Some signs of low mood are present. Self-care and talking to someone you trust can help."}
           :phq9<=14?{label:"Moderate",color:C.amber,icon:"🌧️",msg:"Moderate symptoms of depression are present. Speaking to a doctor or counsellor would be really helpful."}
           :phq9<=19?{label:"Moderately Severe",color:C.peach,icon:"🌩️",msg:"Significant symptoms. We encourage you to speak with a mental health professional as soon as you can."}
           :{label:"Severe",color:C.rose,icon:"⛈️",msg:"These scores suggest you may be struggling a great deal. Please reach out for support — you deserve care."};
  const anx=gad7<=4?{label:"Minimal",color:C.sage,icon:"🌱",msg:"Little to no anxiety detected. You seem to be managing stress reasonably well."}
           :gad7<=9?{label:"Mild",color:C.sky,icon:"🌤️",msg:"Some anxiety is present. Breathing techniques and lifestyle adjustments can make a difference."}
           :gad7<=14?{label:"Moderate",color:C.amber,icon:"🌧️",msg:"Moderate anxiety. Talking to a professional can bring real relief."}
           :{label:"Severe",color:C.rose,icon:"⛈️",msg:"High anxiety levels. Please consider reaching out to a mental health professional soon."};
  const isCrisis=phq9>=20||gad7>=15;
  const needsHelp=phq9>=10||gad7>=10;
  const allGood=phq9<=4&&gad7<=4;

  return(
    <div>
      <Fade>
        <div style={{textAlign:"center",marginBottom:26}}>
          <div style={{fontSize:56,marginBottom:10}}>{allGood?"🌸":isCrisis?"💙":"🌿"}</div>
          <Pill color={C.peach}>Your Results</Pill>
          <h2 style={{fontFamily:FD,fontSize:26,color:C.text,margin:"12px 0 8px"}}>{allGood?"You seem to be doing well":isCrisis?"Thank you for your honesty":"Here's what we found"}</h2>
          <p style={{color:C.textMid,fontSize:15,lineHeight:1.75}}>{allGood?"Your responses suggest low levels of depression and anxiety. Keep caring for yourself.":"These results are a starting point — not a label. They help you have a better conversation with your doctor."}</p>
        </div>
      </Fade>

      {isCrisis&&(
        <Fade delay={100}>
          <div style={{background:C.roseLight,border:`2px solid ${C.rose}`,borderRadius:22,padding:"22px",marginBottom:20}}>
            <p style={{color:C.rose,fontWeight:800,fontSize:16,marginBottom:8}}>💙 You don't have to face this alone</p>
            <p style={{color:C.textMid,fontSize:14,lineHeight:1.75,marginBottom:14}}>Please reach out to someone today — you deserve care and support.</p>
            <div style={{color:C.text,fontSize:14,fontWeight:700,lineHeight:2.2}}>
              📞 iCall: <a href="tel:9152987821" style={{color:C.rose}}>9152987821</a><br/>
              📞 Vandrevala (24/7): <a href="tel:18602662345" style={{color:C.rose}}>1860-2662-345</a><br/>
              📞 NIMHANS: <a href="tel:08046110007" style={{color:C.rose}}>080-46110007</a>
            </div>
          </div>
        </Fade>
      )}

      <Fade delay={200}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
          {[{label:"Depression",code:"PHQ-9",score:phq9,max:27,level:dep},{label:"Anxiety",code:"GAD-7",score:gad7,max:21,level:anx}].map(({label,code,score,max,level})=>(
            <Card key={code} style={{textAlign:"center",background:level.color+"0e",border:`1.5px solid ${level.color}44`}}>
              <div style={{fontSize:30,marginBottom:6}}>{level.icon}</div>
              <div style={{color:C.textSoft,fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:1}}>{label}</div>
              <div style={{color:level.color,fontWeight:800,fontSize:22,margin:"4px 0"}}>{score}<span style={{fontSize:13,fontWeight:600,color:C.textMuted}}>/{max}</span></div>
              <div style={{background:level.color+"22",color:level.color,fontSize:11,fontWeight:800,padding:"3px 10px",borderRadius:20,display:"inline-block"}}>{level.label}</div>
            </Card>
          ))}
        </div>
      </Fade>

      <Fade delay={300}>
        <Card style={{marginBottom:18}}>
          <div style={{color:C.textSoft,fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:1.5,marginBottom:16}}>What this means for you</div>
          {[{...dep,label2:"Depression"},{...anx,label2:"Anxiety"}].map((level,i)=>(
            <div key={i} style={{paddingBottom:i===0?14:0,marginBottom:i===0?14:0,borderBottom:i===0?`1px solid ${C.border}`:"none"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <span style={{fontSize:18}}>{level.icon}</span>
                <span style={{color:level.color,fontWeight:800,fontSize:14}}>{level.label2} · {level.label}</span>
              </div>
              <p style={{color:C.textMid,fontSize:14,lineHeight:1.75}}>{level.msg}</p>
            </div>
          ))}
        </Card>
      </Fade>

      {/* Exercises CTA */}
      <Fade delay={350}>
        <button onClick={onExercises} style={{width:"100%",marginBottom:14,padding:"20px 22px",borderRadius:22,border:`2px solid ${C.sage}`,background:`linear-gradient(135deg,${C.sageLight} 0%,#f0faf4 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:16,transition:"all 0.2s",boxShadow:"0 3px 16px rgba(107,158,130,0.15)"}}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 20px rgba(107,158,130,0.25)";}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 3px 16px rgba(107,158,130,0.15)";}}>
          <div style={{width:52,height:52,borderRadius:16,background:C.sage,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>🌿</div>
          <div style={{flex:1}}>
            <div style={{color:C.sage,fontWeight:800,fontSize:16,marginBottom:3}}>Try a calming exercise</div>
            <div style={{color:C.textMid,fontSize:13,lineHeight:1.5}}>Breathing, grounding, relaxation & more — personalised to your results</div>
          </div>
          <span style={{color:C.sage,fontSize:24}}>›</span>
        </button>
      </Fade>

      {/* FAQ CTA */}
      <Fade delay={390}>
        <button onClick={onFAQ} style={{width:"100%",marginBottom:18,padding:"20px 22px",borderRadius:22,border:`2px solid ${C.sky}`,background:`linear-gradient(135deg,${C.skyLight} 0%,#f0f6ff 100%)`,cursor:"pointer",textAlign:"left",fontFamily:FB,display:"flex",alignItems:"center",gap:16,transition:"all 0.2s",boxShadow:"0 3px 16px rgba(91,143,201,0.12)"}}
          onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 20px rgba(91,143,201,0.22)";}}
          onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 3px 16px rgba(91,143,201,0.12)";}}>
          <div style={{width:52,height:52,borderRadius:16,background:C.sky,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>💬</div>
          <div style={{flex:1}}>
            <div style={{color:C.sky,fontWeight:800,fontSize:16,marginBottom:3}}>Common questions answered</div>
            <div style={{color:C.textMid,fontSize:13,lineHeight:1.5}}>What do my scores mean? Should I see a doctor? And more...</div>
          </div>
          <span style={{color:C.sky,fontSize:24}}>›</span>
        </button>
      </Fade>

      {needsHelp&&!allGood&&(
        <Fade delay={420}>
          <Card style={{marginBottom:18,background:C.sageLight,border:`1.5px solid ${C.sage}55`}}>
            <div style={{color:C.sage,fontWeight:800,fontSize:15,marginBottom:12}}>🌿 Suggested next steps</div>
            {["Share these results with a doctor or psychiatrist","Screenshot this page to show your provider","A specialist can confirm findings and create a care plan","Early support leads to much faster recovery"].map((s,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                <span style={{color:C.sage,fontWeight:800,fontSize:16,marginTop:1}}>✓</span>
                <span style={{color:C.textMid,fontSize:14,lineHeight:1.65}}>{s}</span>
              </div>
            ))}
          </Card>
        </Fade>
      )}

      <Fade delay={470}>
        <p style={{color:C.textMuted,fontSize:12,textAlign:"center",lineHeight:1.7,marginBottom:20}}>⚠️ Wellness screening tool only — not a clinical diagnosis. Always discuss with a qualified professional.</p>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <WarmButton onClick={onLearn} variant="secondary">📚 Learn about mental health</WarmButton>
          <WarmButton onClick={onRetake} variant="ghost">↩ Start over</WarmButton>
        </div>
      </Fade>
    </div>
  );
}

/* ── Learn screen ──────────────────────────────────────────── */
function LearnScreen({onBack}){
  const LEARN_TOPICS=[
    {id:"dep",icon:"🌧️",title:"What is Depression?",color:C.sky,body:`Depression is far more than sadness. It's a real medical condition that changes how you think, feel, and get through each day.\n\nYou might notice:\n• A heavy, empty feeling that won't lift\n• No longer enjoying things you used to love\n• Exhaustion even after a full night's sleep\n• Feeling worthless or like a burden to others\n\nDepression is NOT a character flaw, laziness, or weakness.\n\nIn India, depression often shows up as physical symptoms — headaches, body pain, fatigue — which can make it easy to miss.\n\nThe good news: depression is one of the most treatable mental health conditions.`},
    {id:"anx",icon:"⚡",title:"What is Anxiety?",color:C.amber,body:`Some anxiety is natural — it keeps us alert. But when worry becomes constant and overwhelming, it may be an anxiety disorder.\n\nYou might notice:\n• Racing thoughts that won't slow down\n• Your heart beating faster for no clear reason\n• Avoiding situations that make you nervous\n• Trouble sleeping because your mind won't stop\n\nIn India, common triggers include academic pressure, career uncertainty, family expectations, and financial stress. You are not alone.\n\nAnxiety is very manageable with therapy, medication, and lifestyle changes.`},
    {id:"help",icon:"🤝",title:"When Should I Seek Help?",color:C.sage,body:`Please consider speaking to a professional if:\n\n• Your symptoms have lasted more than 2 weeks\n• Daily life — work, studies, relationships — is being affected\n• You're using alcohol or substances to cope\n• You're having thoughts of hurting yourself\n\nWho can help in India:\n• Psychiatrist — for diagnosis and medication\n• Clinical Psychologist — for therapy and counselling\n• Your GP — a great first step\n\nCrisis lines (free, confidential):\niCall: 9152987821\nVandrevala Foundation: 1860-2662-345 (24/7)\nNIMHANS: 080-46110007`},
    {id:"care",icon:"🌱",title:"Gentle Self-Care Ideas",color:C.peach,body:`Small daily practices can make a real difference:\n\nFor your body:\n• Try to sleep and wake at the same time each day\n• Even a 15-minute walk outside can lift your mood\n• Eat regular meals — your brain needs fuel\n\nFor your mind:\n• Write down 3 things you're grateful for each morning\n• Try 5 minutes of slow, deep breathing (pranayama)\n• Limit news and social media scrolling\n• Be as kind to yourself as you would be to a good friend\n\nRemember: healing is not linear. Some days will be harder. That's okay.`},
    {id:"fam",icon:"👨‍👩‍👧",title:"For Family & Caregivers",color:"#9b72cf",body:`If someone you love is struggling, here's how to truly help:\n\nWhat helps:\n• Just listen — you don't need to fix anything\n• "I'm here for you. You don't have to go through this alone."\n• Help them find and attend professional care\n• Check in regularly, without pressure\n\nWhat doesn't help:\n• "Just think positive!"\n• "Others have it worse"\n• "Pull yourself together"\n\nYour wellbeing matters too:\n• Caring for someone in pain is exhausting\n• It's okay to feel helpless or frustrated\n• Consider speaking to someone yourself`},
  ];
  const [topic,setTopic]=useState(null);
  if(topic) return(
    <div>
      <button onClick={()=>setTopic(null)} style={{background:"none",border:"none",color:C.peach,cursor:"pointer",fontSize:15,fontWeight:800,marginBottom:20,padding:0,fontFamily:FB}}>← Back</button>
      <Fade>
        <div style={{fontSize:48,marginBottom:12}}>{topic.icon}</div>
        <h2 style={{fontFamily:FD,fontSize:24,color:C.text,marginBottom:20}}>{topic.title}</h2>
        {topic.body.split("\n").map((line,i)=>{
          const isHead=line.length>0&&line.length<38&&!line.startsWith("•")&&!line.match(/^[📞]/);
          return line===""?<div key={i} style={{height:8}}/>:<p key={i} style={{color:isHead?topic.color:C.textMid,fontWeight:isHead?800:400,fontSize:15,lineHeight:1.8,marginBottom:isHead?4:2}}>{line}</p>;
        })}
      </Fade>
    </div>
  );
  return(
    <div>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.peach,cursor:"pointer",fontSize:15,fontWeight:800,marginBottom:20,padding:0,fontFamily:FB}}>← Back</button>
      <Fade>
        <h2 style={{fontFamily:FD,fontSize:26,color:C.text,marginBottom:6}}>Learn & Understand</h2>
        <p style={{color:C.textMid,fontSize:15,marginBottom:24}}>Gentle guides to make sense of mental health.</p>
      </Fade>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {LEARN_TOPICS.map((t,i)=>(
          <Fade key={t.id} delay={i*80}>
            <button onClick={()=>setTopic(t)} style={{display:"flex",alignItems:"center",gap:16,padding:"18px 20px",background:C.card,border:`1.5px solid ${C.border}`,borderRadius:20,cursor:"pointer",textAlign:"left",width:"100%",fontFamily:FB,transition:"all 0.2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=t.color;e.currentTarget.style.background=t.color+"0f";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background=C.card;}}>
              <div style={{width:50,height:50,borderRadius:15,background:t.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0}}>{t.icon}</div>
              <span style={{color:C.text,fontWeight:800,fontSize:15}}>{t.title}</span>
              <span style={{marginLeft:"auto",color:C.textMuted,fontSize:22}}>›</span>
            </button>
          </Fade>
        ))}
      </div>
    </div>
  );
}

/* ── Root app ──────────────────────────────────────────────── */
const STEP={WELCOME:"w",WHO:"who",INTRO:"intro",PHQ9:"phq9",BRIDGE:"bridge",GAD7:"gad7",RESULT:"result",EXERCISES:"exercises",FAQ:"faq",LEARN:"learn"};

export default function App(){
  const [step,setStep]=useState(STEP.WELCOME);
  const [who,setWho]=useState("self");
  const [phq9,setPhq9]=useState(0);
  const [gad7,setGad7]=useState(0);
  const reset=()=>{setStep(STEP.WELCOME);setPhq9(0);setGad7(0);};

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
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:32}}>
            <div style={{fontFamily:FD,color:C.peach,fontWeight:700,fontSize:20}}>🌸 ManaScreen</div>
            {[STEP.RESULT,STEP.EXERCISES,STEP.FAQ].includes(step)&&<button onClick={reset} style={{background:"none",border:"none",color:C.textSoft,cursor:"pointer",fontSize:13,fontFamily:FB}}>Start over</button>}
          </div>
        )}
        {step===STEP.WELCOME   && <WelcomeScreen onNext={()=>setStep(STEP.WHO)}/>}
        {step===STEP.WHO       && <WhoScreen onSelect={v=>{setWho(v);setStep(STEP.INTRO);}}/>}
        {step===STEP.INTRO     && <IntroScreen who={who} onNext={()=>setStep(STEP.PHQ9)}/>}
        {step===STEP.PHQ9      && <QuestionScreen questions={PHQ9} code="PHQ-9" color={C.sky} bgColor={C.skyLight} sectionTitle="Depression" onComplete={s=>{setPhq9(s);setStep(STEP.BRIDGE);}}/>}
        {step===STEP.BRIDGE    && <SectionBridge onNext={()=>setStep(STEP.GAD7)}/>}
        {step===STEP.GAD7      && <QuestionScreen questions={GAD7} code="GAD-7" color={C.sage} bgColor={C.sageLight} sectionTitle="Anxiety" onComplete={s=>{setGad7(s);setStep(STEP.RESULT);}}/>}
        {step===STEP.RESULT    && <ResultScreen phq9={phq9} gad7={gad7} who={who} onExercises={()=>setStep(STEP.EXERCISES)} onFAQ={()=>setStep(STEP.FAQ)} onLearn={()=>setStep(STEP.LEARN)} onRetake={reset}/>}
        {step===STEP.EXERCISES && <ExercisesScreen phq9={phq9} gad7={gad7} onDone={()=>setStep(STEP.RESULT)}/>}
        {step===STEP.FAQ       && <FAQScreen phq9={phq9} gad7={gad7} onBack={()=>setStep(STEP.RESULT)}/>}
        {step===STEP.LEARN     && <LearnScreen onBack={()=>setStep(STEP.RESULT)}/>}
      </div>
    </div>
  );
}
