"use client";

import React from "react";

const {useState,useEffect,useRef} = React;

const CLOUDINARY_CLOUD  = "ddjdyn0yj";
const CLOUDINARY_PRESET = "lod_unsigned";
const APPS_SCRIPT_URL   = "https://script.google.com/macros/s/AKfycbwtVcrYr-6Gth2v2OxM5XRYuIRDzHoycjXLfoMZ23AyRmcwtuFYK5YUvPzdXXUifa4G/exec";
const IS_ADMIN = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("admin")==="true" : false;

const DEFAULTS = {
  "홈페이지 제목":"동대문 새벽시장\n전문 사입 서비스",
  "메인 영상 URL":"",
  "공지사항":"",
  "강북팀 이름":"강북·도봉·노원·중랑",
  "강북팀 소개":"안녕하세요!\n강북·노원·도봉·중랑 지역 사입 담당, HOON삼촌입니다. 😊\n동대문 시장에서만 18년, 단순히 물건을 옮기는 것을 넘어 사장님의 든든한 파트너 입니다.\n어떤 상품이 잘 나가는지, 어떤 신상이 괜찮은지 현장의 생생한 정보를 아낌없이 공유하겠습니다.\n어려운 시장 일은 저에게 맡기시고,\n\"사장님께서는 판매에만 집중하세요!\"\n시장 일만큼은 저희가 가장 철저하고 확실하게 책임지겠습니다.\n감사합니다.",
  "강북팀 카카오":"https://open.kakao.com/SEOUL_NORTH",
  "인천팀 이름":"인천·부천",
  "인천팀 소개":"인천·부천 지역 사입의 최고 전문가 팀입니다.\n20년 경력의 완벽한 픽업과 빠른 피드백을 약속드립니다.\n경기권 로드샵 사장님들의 든든한 파트너가 되겠습니다.",
  "인천팀 카카오":"https://open.kakao.com/INCHEON_BUCHEON",
  "안양팀 이름":"안양·과천·군포·의왕",
  "안양팀 소개":"안양·과천·군포·의왕 지역 사입 전문 팀입니다.\n정확한 픽업과 꼼꼼한 검수로 사장님의 든든한 파트너가 되겠습니다.",
  "안양팀 카카오":"",
  "안양팀_영상URL":"",
  "안양팀_사진URL":"",
  "룩북1_URL":"","룩북2_URL":"","룩북3_URL":"","룩북4_URL":"",
  "사입 프로그램":"https://yongsaib.sosolution.net/login",
  "상담 링크":"",
};

function saveToSheet(key:string,value:string){
  return new Promise(resolve=>{
    const name="save_"+Date.now();
    const s=document.createElement("script");
    const p=new URLSearchParams({callback:name,action:"update",key,value,t:String(Date.now())});
    s.src=APPS_SCRIPT_URL+"?"+p.toString();
    window[name]=(res)=>{delete window[name];if(document.body.contains(s))document.body.removeChild(s);resolve(res);};
    s.onerror=()=>{delete window[name];if(document.body.contains(s))document.body.removeChild(s);resolve(null);};
    setTimeout(()=>{if(window[name]){delete window[name];if(document.body.contains(s))document.body.removeChild(s);resolve(null);}},8000);
    document.body.appendChild(s);
  });
}

function loadSheet(callback){
  try{const c=localStorage.getItem("saip_cache");if(c)callback({...DEFAULTS,...JSON.parse(c)});}catch{}
  const name="cb_"+Date.now();
  const s=document.createElement("script");
  s.src=APPS_SCRIPT_URL+"?callback="+name+"&t="+Date.now();
  window[name]=(res)=>{
    delete window[name];document.body.removeChild(s);
    if(res&&res.status==="ok"){try{localStorage.setItem("saip_cache",JSON.stringify(res.data));}catch{}callback({...DEFAULTS,...res.data});}
  };
  s.onerror=()=>{delete window[name];document.body.removeChild(s);callback({...DEFAULTS});};
  document.body.appendChild(s);
}

function uploadFile(file,type,onProgress){
  const max=type==="video"?500*1024*1024:20*1024*1024;
  if(file.size>max)return Promise.reject(new Error("파일이 너무 큽니다."));
  return new Promise((resolve,reject)=>{
    const fd=new FormData();fd.append("file",file);fd.append("upload_preset",CLOUDINARY_PRESET);
    const xhr=new XMLHttpRequest();
    xhr.upload.onprogress=e=>{if(e.lengthComputable&&onProgress)onProgress(Math.round(e.loaded/e.total*100));};
    xhr.onload=()=>{const res=JSON.parse(xhr.responseText);if(res.secure_url)resolve(res.secure_url);else reject(new Error("업로드 실패"));};
    xhr.onerror=()=>reject(new Error("연결 오류"));
    xhr.timeout=5*60*1000;
    xhr.open("POST",`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${type}/upload`);
    xhr.send(fd);
  });
}

function useClock(){
  const [t,setT]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setT(new Date()),1000);return()=>clearInterval(id);},[]);
  return t.toLocaleTimeString("ko-KR",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

function LDLogo({size=54}){
  return(
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{flexShrink:0}}>
      <circle cx="50" cy="50" r="47" stroke="#f0ece4" strokeWidth="3" fill="none"/>
      <text x="10" y="73" fontFamily="Georgia,serif" fontWeight="400" fontSize="68" fill="#f0ece4" letterSpacing="-1">LD</text>
    </svg>
  );
}

function UploadOverlay({prog,text}){
  return(
    <div className="progress-overlay">
      <div style={{fontSize:13,color:"#f0ece4",fontWeight:700}}>{text} {prog}%</div>
      <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{width:prog+"%"}}/></div>
    </div>
  );
}

function LookCard({id,url,onSaved}){
  const fileRef=useRef(null);
  const [src,setSrc]=useState(url||"");
  const [prog,setProg]=useState(0);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{if(url)setSrc(url);},[url]);
  const handleFile=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    setError("");setLoading(true);setProg(0);
    try{
      const newUrl=await uploadFile(file,"image",setProg);
      setSrc(newUrl);
      await saveToSheet(`룩북${id}_URL`,newUrl);
      if(onSaved)onSaved(id,newUrl);
    }catch(err){setError(err.message);}
    finally{setLoading(false);e.target.value="";}
  };
  return(
    <div>
      <div className="lcard">
        <div className="lcard-inner">
          {src
            ?<img src={src} alt={`룩북${id}`} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
            :<><div style={{width:42,height:42,border:"1px solid rgba(240,236,228,.12)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"rgba(240,236,228,.18)"}}>+</div>
              <span style={{fontSize:10,letterSpacing:".24em",textTransform:"uppercase",color:"rgba(240,236,228,.2)"}}>{String(id).padStart(2,"0")}</span></>
          }
        </div>
        {loading&&<UploadOverlay prog={prog} text="업로드"/>}
        {IS_ADMIN&&!loading&&(
          <button className="upload-btn" style={{fontSize:10,padding:"5px 12px",bottom:8}}
            onClick={e=>{e.stopPropagation();fileRef.current?.click();}}>
            {src?"📷 교체":"📷 업로드"}
          </button>
        )}
        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px 10px",background:"linear-gradient(to top,rgba(0,0,0,.7),transparent)"}}>
          <div style={{fontSize:10,letterSpacing:".2em",color:"rgba(240,236,228,.5)",textTransform:"uppercase"}}>LOOK {String(id).padStart(2,"0")}</div>
        </div>
      </div>
      {error&&<div style={{marginTop:4,fontSize:10,color:"rgba(255,140,140,.85)",textAlign:"center"}}>{error}</div>}
      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
    </div>
  );
}

function MainVideoBox({url,onSave}){
  const fileRef=useRef(null);
  const vidRef=useRef(null);
  const [src,setSrc]=useState(url||"");
  const [prog,setProg]=useState(0);
  const [loading,setLoading]=useState(false);
  const [muted,setMuted]=useState(true);
  useEffect(()=>{if(url)setSrc(url);},[url]);
  const handleFile=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    setLoading(true);setProg(0);
    try{
      const newUrl=await uploadFile(file,"video",setProg);
      setSrc(newUrl);
      await saveToSheet("메인 영상 URL",newUrl);
      if(onSave)onSave(newUrl);
    }catch(err){}
    finally{setLoading(false);e.target.value="";}
  };
  return(
    <div className="vbox-main">
      {src
        ?<video ref={vidRef} src={src} autoPlay muted loop playsInline style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
        :<div className="vbox-ph">
          <div style={{width:76,height:76,borderRadius:"50%",border:"1px solid rgba(240,236,228,.18)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:0,height:0,borderTop:"11px solid transparent",borderBottom:"11px solid transparent",borderLeft:"18px solid rgba(240,236,228,.38)",marginLeft:5}}/>
          </div>
          <span style={{fontSize:11,letterSpacing:".34em",color:"rgba(240,236,228,.22)",textTransform:"uppercase"}}>L O D FILM</span>
        </div>
      }
      {loading&&<UploadOverlay prog={prog} text="업로드 중"/>}
      {src&&!loading&&(
        <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(to top,rgba(0,0,0,.75),transparent)",padding:"32px 14px 12px",display:"flex",alignItems:"center",gap:8,zIndex:3}}>
          <button onClick={()=>{if(!vidRef.current)return;vidRef.current.muted=!muted;setMuted(!muted);}}
            style={{background:"rgba(0,0,0,.7)",border:"1px solid rgba(255,255,255,.3)",borderRadius:30,padding:"10px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
            {muted
              ?<><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg><span style={{fontSize:15,color:"#fff",fontWeight:700}}>소리 켜짐</span></>
              :<><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54,8.46a5,5,0,0,1,0,7.07"/></svg><span style={{fontSize:15,color:"#fff",fontWeight:700}}>음소거</span></>
            }
          </button>
        </div>
      )}
      {IS_ADMIN&&!loading&&(
        <button className="upload-btn" style={{bottom:src?50:10}} onClick={()=>fileRef.current?.click()}>
          {src?"📁 영상 교체":"📁 영상 업로드"}
        </button>
      )}
      <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={handleFile}/>
    </div>
  );
}

function EditModal({label,value,onSave,onClose}){
  const [val,setVal]=useState(value);
  const [saving,setSaving]=useState(false);
  const save=async()=>{setSaving(true);await onSave(val);setSaving(false);onClose();};
  return(
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:14,fontWeight:700,color:"#f0ece4",marginBottom:14}}>✏️ {label} 수정</div>
        <textarea className="modal-textarea" value={val} onChange={e=>setVal(e.target.value)} autoFocus/>
        <div style={{marginTop:14,display:"flex",gap:8}}>
          <button onClick={save} disabled={saving} style={{background:"#CCFF00",color:"#0a0a0a",border:"none",borderRadius:10,padding:"10px 24px",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit"}}>
            {saving?"저장 중...":"✅ 저장"}
          </button>
          <button onClick={onClose} style={{background:"transparent",border:"1px solid rgba(240,236,228,.2)",color:"rgba(240,236,228,.55)",borderRadius:10,padding:"10px 18px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>취소</button>
        </div>
      </div>
    </div>
  );
}

function AgentPage({ag,onBack,allAgents,onAgent,data,onUpdate,saipLink}){
  const [editField,setEditField]=useState(null);
  const introKey=ag.id==="SN"?"강북팀 소개":ag.id==="AY"?"안양팀 소개":"인천팀 소개";
  const kakaoKey=ag.id==="SN"?"강북팀 카카오":ag.id==="AY"?"안양팀 카카오":"인천팀 카카오";
  const videoKey=ag.id==="SN"?"강북팀_영상URL":ag.id==="AY"?"안양팀_영상URL":"인천팀_영상URL";
  const photoKey=ag.id==="SN"?"강북팀_사진URL":ag.id==="AY"?"안양팀_사진URL":"인천팀_사진URL";
  const intro=data[introKey]||ag.intro||"";
  const kakao=data[kakaoKey]||ag.kakao||"";
  const [videoUrl,setVideoUrl]=useState(data[videoKey]||"");
  const [photoUrl,setPhotoUrl]=useState(data[photoKey]||"");
  const [loading,setLoading]=useState(false);
  const [prog,setProg]=useState(0);
  const fileRef=useRef(null);
  const vidRef=useRef(null);
  const [muted,setMuted]=useState(true);

  useEffect(()=>{
    window.scrollTo({top:0});
    setVideoUrl(data[videoKey]||"");
    setPhotoUrl(data[photoKey]||"");
  },[ag.id]);

  const handleSave=async(key,val)=>{await saveToSheet(key,val);if(onUpdate)onUpdate(key,val);};

  const handleMedia=async(file)=>{
    const isVideo=file.type.startsWith("video/");
    const type=isVideo?"video":"image";
    const key=isVideo?videoKey:photoKey;
    setLoading(true);setProg(0);
    try{
      const url=await uploadFile(file,type,setProg);
      if(isVideo){setVideoUrl(url);setPhotoUrl("");}
      else{setPhotoUrl(url);setVideoUrl("");}
      await saveToSheet(key,url);
      await saveToSheet(isVideo?photoKey:videoKey,"");
      if(onUpdate){onUpdate(key,url);onUpdate(isVideo?photoKey:videoKey,"");}
    }catch(err){}
    finally{setLoading(false);}
  };

  return(
    <div style={{padding:"24px 0",minHeight:"100vh"}}>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
        {[...Array(12)].map((_,i)=>(
          <div key={i} style={{position:"absolute",width:3,height:3,borderRadius:"50%",background:"rgba(204,255,0,.4)",left:`${10+i*8}%`,top:`${50+((i*37)%50)}%`,animation:`float ${5+i%4}s linear ${i*.5}s infinite`}}/>
        ))}
      </div>
      <div className="inner" style={{position:"relative",zIndex:1}}>
        <button onClick={onBack} style={{background:"rgba(204,255,0,.1)",border:"2px solid rgba(204,255,0,.5)",borderRadius:50,cursor:"pointer",display:"flex",alignItems:"center",gap:14,padding:"16px 32px",fontFamily:"inherit",marginBottom:40,transition:"all .2s"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.2)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.1)"}>
          <span style={{fontSize:28,color:"#CCFF00",fontWeight:900}}>←</span>
          <span style={{fontSize:22,fontWeight:900,color:"#CCFF00",letterSpacing:".12em"}}>BACK</span>
        </button>

        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontSize:11,letterSpacing:".4em",color:"rgba(240,236,228,.3)",marginBottom:12,textTransform:"uppercase",fontSize:"clamp(13px,1.5vw,17px)"}}>{ag.regionEn}</div>
          <h2 style={{fontSize:"clamp(32px,5vw,52px)",fontWeight:900,color:"#f0ece4",cursor:IS_ADMIN?"pointer":"default"}}
            onClick={()=>IS_ADMIN&&setEditField({key:ag.id==="SN"?"강북팀 이름":ag.id==="AY"?"안양팀 이름":"인천팀 이름",label:"팀 이름",value:data[ag.id==="SN"?"강북팀 이름":ag.id==="AY"?"안양팀 이름":"인천팀 이름"]||ag.label})}>
            {data[ag.id==="SN"?"강북팀 이름":ag.id==="AY"?"안양팀 이름":"인천팀 이름"]||ag.label}
          </h2>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:48,alignItems:"start",marginBottom:40}} className="agent-grid">
          <div style={{maxWidth:360,margin:"0 auto",width:"100%"}}>
            <div className="vbox" style={{cursor:IS_ADMIN?"pointer":"default"}} onClick={()=>IS_ADMIN&&fileRef.current?.click()}>
              {videoUrl
                ?<video ref={vidRef} src={videoUrl} autoPlay muted loop playsInline style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
                :photoUrl
                  ?<img src={photoUrl} alt="팀 미디어" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}/>
                  :<div className="vbox-ph">
                    <div style={{width:56,height:56,border:"1px solid rgba(240,236,228,.15)",borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,color:"rgba(240,236,228,.2)"}}>+</div>
                    <span style={{fontSize:11,letterSpacing:".2em",color:"rgba(240,236,228,.22)",textTransform:"uppercase"}}>사진 또는 영상</span>
                  </div>
              }
              {loading&&<UploadOverlay prog={prog} text="업로드 중"/>}
              {videoUrl&&!loading&&(
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(to top,rgba(0,0,0,.75),transparent)",padding:"32px 14px 12px",zIndex:3}}>
                  <button onClick={e=>{e.stopPropagation();if(!vidRef.current)return;vidRef.current.muted=!muted;setMuted(!muted);}}
                    style={{background:"rgba(0,0,0,.7)",border:"1px solid rgba(255,255,255,.3)",borderRadius:30,padding:"10px 20px",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
                    {muted
                      ?<><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg><span style={{fontSize:15,color:"#fff",fontWeight:700}}>소리 켜짐</span></>
                      :<><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/><path d="M15.54,8.46a5,5,0,0,1,0,7.07"/></svg><span style={{fontSize:15,color:"#fff",fontWeight:700}}>음소거</span></>
                    }
                  </button>
                </div>
              )}
              {IS_ADMIN&&!loading&&(
                <button className="upload-btn" style={{bottom:(videoUrl||photoUrl)?50:10}} onClick={e=>{e.stopPropagation();fileRef.current?.click();}}>
                  {(videoUrl||photoUrl)?"📁 교체하기":"📁 사진/영상 올리기"}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" style={{display:"none"}}
              onChange={e=>{const f=e.target.files[0];if(f)handleMedia(f);e.target.value="";}}/>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:20,justifyContent:"center"}}>
            <div className="shimmer-border" style={{background:"rgba(240,236,228,.03)",border:"1px solid rgba(240,236,228,.08)",borderRadius:20,padding:"32px",cursor:IS_ADMIN?"pointer":"default",position:"relative",minHeight:220}}
              onClick={()=>IS_ADMIN&&setEditField({key:introKey,label:"소개글",value:intro})}>
              {intro.split("\n").map((line,i)=>(
                <p key={i} style={{fontSize:"clamp(15px,1.6vw,18px)",lineHeight:2.2,color:"rgba(240,236,228,.85)",marginBottom:i<intro.split("\n").length-1?10:0,wordBreak:"keep-all"}}>{line}</p>
              ))}
            </div>

            <a href={kakao} target="_blank" rel="noopener noreferrer" className="kakao-btn" style={{width:"100%",boxSizing:"border-box"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#3C1E1E"><path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.7 5.1 4.3 6.5l-1.1 4 4.5-2.9c.7.1 1.5.2 2.3.2 5.523 0 10-3.477 10-7.8S17.523 3 12 3z"/></svg>
              카카오톡 문의하기
            </a>

            {ag.id!=="AY"&&<a href={saipLink} target="_blank" rel="noopener noreferrer"
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:"#f0ece4",border:"none",borderRadius:50,padding:"16px 32px",fontSize:16,fontWeight:900,color:"#0a0a0a",textDecoration:"none",transition:"all .2s",boxSizing:"border-box"}}
              onMouseEnter={e=>e.currentTarget.style.opacity=".85"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              사입 프로그램 바로가기 →
            </a>}

            {IS_ADMIN&&(
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:10,color:"rgba(240,236,228,.4)",whiteSpace:"nowrap"}}>카카오 링크:</span>
                <input defaultValue={kakao} onBlur={e=>handleSave(kakaoKey,e.target.value)}
                  style={{flex:1,background:"rgba(255,255,255,.07)",border:"1px solid rgba(240,236,228,.2)",borderRadius:10,padding:"6px 10px",fontSize:11,color:"#f0ece4",fontFamily:"inherit",outline:"none"}}/>
              </div>
            )}
          </div>
        </div>

        <div style={{marginBottom:32}}>
          <div style={{fontSize:13,letterSpacing:".2em",color:"rgba(240,236,228,.26)",textTransform:"uppercase",marginBottom:16,textAlign:"center"}}>다른 지역 담당</div>
          {allAgents.filter(a=>a.id!==ag.id).map(other=>(
            <button key={other.id} onClick={()=>onAgent(other)} className="rbtn shimmer-border" style={{marginBottom:10}}>
              <div style={{fontSize:"clamp(18px,2.5vw,26px)",fontWeight:900,color:"#CCFF00",flex:1,textAlign:"center"}}>
                {data[other.id==="SN"?"강북팀 이름":other.id==="AY"?"안양팀 이름":"인천팀 이름"]||other.label}
              </div>
              <span style={{fontSize:24,color:"#CCFF00",fontWeight:900}}>→</span>
            </button>
          ))}
        </div>
      </div>
      {editField&&<EditModal label={editField.label} value={editField.value} onSave={val=>handleSave(editField.key,val)} onClose={()=>setEditField(null)}/>}
    </div>
  );
}

function AIBanner({IS_ADMIN, uploadFile, saveToSheet, aiInquiryLink, tiktokBannerLink}){
  const [bannerImg,setBannerImg]=React.useState(()=>{try{return localStorage.getItem("lod_banner_img")||"";}catch{return "";}});
  const [bannerScale,setBannerScale]=React.useState(()=>{try{return parseFloat(localStorage.getItem("lod_banner_scale"))||1.03;}catch{return 1.03;}});
  const [bannerPos,setBannerPos]=React.useState(()=>{try{const p=JSON.parse(localStorage.getItem("lod_banner_pos"));return p||{x:0,y:0};}catch{return {x:0,y:0};}});
  const [isDragging,setIsDragging]=React.useState(false);
  const [dragStart,setDragStart]=React.useState({x:0,y:0});
  const [bannerLoading,setBannerLoading]=React.useState(false);
  const [bannerProg,setBannerProg]=React.useState(0);
  const bannerFileRef=React.useRef(null);
  const DEFAULT_IMG="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCALCBVIDASIAAhEBAxEB/8QAHQABAQACAwEBAQAAAAAAAAAAAAECBAMFBgcICf/EAEkQAAIBAgMFBQUHAgUBCAEEAwABAgMRBCExBRJBUWEGEyJxgQcykbHBFEJSodHh8CNiCBUzcvGCFiRDU5KissI0FyVE0kZzk//EABoBAQEBAQEBAQAAAAAAAAAAAAABAgMEBQb/xAApEQEBAAICAwEAAgIBBQEBAAAAAQIRAyEEEjFBEyIyUQUUIzNCYRVx/9oADAMBAAIRAxEAPwD8ZoAAAAAACAAAAOAAAAABcAALgABcAAAACAAAAAEMwAAbBAKAAAAAIAAANAAF+gAAAAACAUEKAAABAAArgAALgABcAAgAAAAAAAB0DuAAAAAAAAEAAAAAABcBAAAAAAAAAQoAAAAF0Gb1AQFIA8wA4AAAC2AhlT99GNzKn76A5i9bERVoaZHnzAyADMN8wRPQKruEOJOIFBCgALZAAAXy4hEKTUK4BNgo0ALyCIihQXACAHkOIAIMagAUgF4EAAXdi3IAKnkPUhVmFPMFsiWCKtAECgAL8iAgAAD1C0AVCGRAgtA+RRqFY2BkRoInzLoMxmAGYFwBEAgAACgGQCBCjiBBmUiYAqJcALsai4CgAABEAFA6gIBoWAEAAVroEBlVAAAAABcAAAAAAAAgAoAAIAAAAAFwAAAAAAACFAAAABmACAAAXAAAhQIUhQAAAhQACAAAAAACACgAQoYAAAAAAAAAIAAAQoAAAEAAAAAAAACACggAoAQAAAAAAAAAELYAgyFAAAAAh8wHUype+iaWLS99AcyKuoIaRSDoM+SAeQ9A9Mg2AWmgBQACABAAIAEQFWpSFQUDDFwJ6C+ZQBOBUxYALhAWCAAADMfIcQpfMXDQQDgLF9SACoW4DQCjzMoQlPReps08JKTS3X5tWH1GokU7GGBi5WVanfk2csdnJvdas+jLodQOhuYzA1qNSKUW4zfhZHhZwlu2z00GhqqLs3p5ktnqjaeGk3JO291ZPsVW9rxv0dxpWtYGdSlOnK01bkYEAAAGAAgEOBAq2A6ACEKRgAAAAAAZFIEMkRspEAuCFvwCnEhdRZgQuRCoBw0IVdQAAABkLqgELgAAAArWBCmVAAAAAAAAAAAQAAAAAgAAAAAAAEAAAuAAAAAAAAAAAAAAAQoAAAAAAADAAAAAAAIW+QAEKBkAAAAAAAAAAAAXAAABAAAAQAAAcAAAAAAAB6kKBCgZAAAAAQAAEAFIUAAACAQAcRk+IGXkAyHAXADIyp++icNS0vfQHORaBl4GkTMZ8ykArvzGfMK2gyAdLgAIAABwF8wQKpcyC3UAVcr5EKrALdR65DUABbLMtiBAZcwxYBlzAADO9ggkxncKoAAC3UFVgIiPIyHDIAjbwWBnX8cvDBcXoZ7PwTqvvK3hprPPidpWxdOjTUKcY7y0ViyI1pRVNR7uMYpZd5Lh5I1q1aLbV51JdXY18Zi3Obc5OUvka8a05yyTfmX4jssNG8k3CzWl3kzalipQjk/EtE9TrIVHpupeTsbmBo1cVVsm5WJtY5liMY4b0laN73kjKNapOTc5Zc91I59r1VOtGjTV400o2Ty0NWE917s47q4Nq4l2unBiaUJy3otx6pmvBV6bvZ1o/mbNeO/nF2TzVjGl3sJJuKa52LUrmodxiYqm57suMKhr4zZtSku8g1OD5ao7CNKjibb0Eqi4NZ/E5acalLKMpTjFZxlqiVXm2rOzyDVjtto4anU/qQg0/vLqdVOLUmmRGILYjViKZku9CtOxHoUFd6MZcyDQC3J6jIqsBLFCsAIUhQgQoAxegzACoAUAmUi1KBGBroUCIAtghZWFgOIEsQydyBQBAACWANtdAhTKgAAIAAQoAAAAAAAF2MwAFxoAFxcAAAAAAAAZhABcaABmLjQABcAAAAIUAABYAAAAzGYADMXAAAACFAAABIAUgAZhsAB1FwAAAAAAAOA0AAAAA2AAuLgAAAABCgAAAQGYAouQABcAAAQCgAAAABcyDMC+YsQeYBt3AAAcAACMqX+osjEzp++gOYDyK3c0ymgDuM/MAM+o+AsAAAAAABkAAKLBAConEoFIABSEAoXz1KQIAEAgL6j1DV7WCTKBTF3C6DRtlxGZirvLiWKbvkSwZq8vdOw2bgJV26tRbtOObfMx2VgJYiped401m89T0EpU4w3Y7saVPK3BssiyNHEvdo2h4IpZK+VubOir1qlao1STSbs5cZHbbR7zENeCUaeWWlzrKkpQk44fOWjkuHRFpWvOnTpu034uWrOWhUjdWpKS6s46eHlKWbzbNl0ZUEms7oztmxXuSllBRfR3PR9n40qezcVXslXjFKN+Kep5zB06lWuko3uz02MpxwmzIR3bVKq3m9LcjOV/GsZ+vO1pXxcpOpd34cTejvSordjvZcXqaFKjOdS+7LXVHZww9aFPvF/Ujb3b2f7m58Rrxp3eV4PRxZz0IyheLt1vo0cMpNPPxLjGWq8zmcXGHeJt028pLWD5MKlaMoNzp38Cu48Y+XQ5qGJjiFvSbUktVr+5qYhyUV4opx4r+aGs5zhPv6WTv44pfmiJvTtajjvZ3TTu0tGuaOpx1OMqmS1zT5r9TsKc1Wgq1Jq6V5Ll1RwYunGpScr7vNJe6+aIv46eUWm+K5kOSaldwqWUl+fU43xKDsR2fExvkNWGdqX8yJ5WKr68QqJ55FtfmFe2YAXdyX4F6kAJlIAAAAjGpeBAARbDQB8x0AQAZgALvQq8ydSAUABQl8ioBEAAAD4gDVABloKABCgAAAAAAAAAOIAAAEAoIUAAAAAAAMAAQoAAAQpCgAAAAAAPQAACFAAEAFIUCFAAAAAAAABAKLkKBCkKAAAAAIAAAAAAAhQAAAIAgFF8gAA4AAAQoAEAApAAKQoBAAAAAABAKAADsAAAIUAvzM6atUSMS0vfQHOCeozuaZV6akLdgANNGQBQXHG5fICFBEBQAEOAQAFCIhmFZEuMxmDRfMD0QzXACoAFC3Utsv3IXgET4hjroR6hlLuwSdyk8iqptYHDyqz93K+nN8jXpx36iR3uAhTp0nVkrKKtBW1fFhZNtynB4elCjBrelm7fmzPu1NuMUu7pZyvxfI4adTd3qklvVZ+G3LlE3o0+6w9OnFeN+JvqI26naCrV6rpxyXF6bqNCbw1Bd2vG1rnkbG2MRuXoUpWj9+V9WdM5OUsszNLqNuOJjGWVNX4HK8TKq0nG2RNn7Nr4qa3YvXkez2D2Qq10k6E5Xdlkcss5i6YcWWfx53YuGqSqqSilJtarI29uzlPFOKzSVrcD6rgvZ1ioYB1Y0txWuk9TzG2+ydenNvdlv+XzOX82O3f/AKTLTw+CpOM72duJz43ES0clbpobOOpYjAT3JwuuKksjrZyWIblStvL3oSPRjlt5s+O4pGcZv+plL7s+K8+ghUVOU1u+GWU48jGVCTi6lFOSXvQ4ryOFz3fEtV+aN6c/jhxUqlKoovOHB31RKVSN1LhxOWtKNahuqNmtG+D/AEOvUnTlbhyG2bHYKUsJVVannB6rgc9SopR72kr3XijzRo08TKNLu5JShwvwOTDSaaUXZcE+HQl7ajixCgppu+41eMuRr1ItPgbWJio3yyly+6zhp2knTlwWRn4WNZ68BxOSUbXMWjTMiJFsPIX4BdDIg30H5hTMDTkPQIAthYKgBVqBLAoCBOhSBTjoAyJgUcCFAgHoACAWgAAqYCICkAAWAGsgQploAAEKAgAAQAAAAQoAEKBCgIAAAAAAABAAQoAAgFIUAAAgCAAAXAAIAAAABCgAAAgAAAAAAAAIUACFAAhQAAAAAEAoAAAhQIUACFAAABAAAAAAAhQAAAAAAAAAAAEKNABCkKAAFkAQ0DFlzADhqAAMqfvox4GVL30BzMBh6amkM+AzsFpnqPUArlJYturAhQNAHEMLToGAAAQAIFVXKRFAIEWgsBQRcigUBF4FAaAj4BDiT4kvmVPKxWTUsU7tIW6mcVnZZBW3s2hv1G0slxZ2kkl4m1GEFaK5tcTHZVFRwl2vFJ/AYilKpOFGL9529OIdJ1HPsqmpzliaqfdxbcL8epybQxaoxbvm1d24ckbSp04U6dGMWoU43k/kjzu2q7lVcU/MWrenXYiUq1VtaX0PQ9kOzlfa2MhThTbTedkdRsrDOtWVldt2R+n/AGIdkIUcHSxNakt+Vnmjy83J6vR43B73dc3s/wDZhRpYanPEUFeyurH1DZ3ZLBYWnFRw8FZaqJ6vZWBhSoq0UjdnRio6Hkv9n0JlMeo8xV2XR7jc3FpyPMba7K0MS21FKXkfRK1FNZK5p1sOraaHLLGu2GT4f2l7DUa9OUJ4RN2edj5D2n7AYjBVpVsKnGzulyP1xtDDRlFq3A8T2k2VSq05Lu07pmseTLEz4seSdx+TcdCtQk206denqlpJHW4mfeXqwVn96PJn0j2j9n6lCvKpRi9W07HzGrvUpu6au7NH0ePl9pt8Xn4vTLTglNxk3FtJ5NciT8cd7jxMZpJtJ3TMYScZWeh0rzIrq6bOShU3Zq+aJUitVwMLNNSRNnx2cn3kJJ2aazu/zNScNyV7+KLsZ4eo3Se6845nKlCc1F6NZeXIlbnccFWO/TUks0szgfI5qbacqcnZp7qOKSzvnfiaiWMbWy0IXMW5solmEmmLZ6uw9QFnxJmZdBYCAqQsgMSgBAPoAwqBgALAACZl4CwAgLYWAiBSBACzLYCcLApAJ8QX4ALprAhUZUAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAC5haAQB6gAAAAAAAAAAAABQIAAAAAAACFAAAAAAUCAAAAAAAAAACFAsAAAAAAEAAAuAAAAAAAAEAA4AAA2AAQAAAACFAAhUAAt0LboyF1YE0Y11DsF5gEAABlS99GPAype+gOYWGrsW5pAWyDKES2fEWvwLmRLiAXkPQDPiA+IBNAKAQKpCgAAOIDiULUMIoAAZlILlFZg9S3uR6gqOyZkr3IlqZebKhlfW5y0471RLmzjzZs7Oj3mNgnzIj0eGpP7PRja12la3QQS+21KnCEd1LnLictOoqfdu3uwlK9/Q4dkwdTEyk3dQd9eJI7N/Gp4bZtWq/elfPqeMxSlOUXZtu/wAz1XaiulgIU4u29Jv4HmsH/UxVKLWVxlekvd09d7Otjyxe2cLScMt5Nn7M7D7Lhhtn0YRha0VwPz37EdjrEbUVbduopWP1NsPDOnRgrcErHzeW+2T7HDPXjdxQhuQS6EqozkmlbM4Z+Fc0WJpwVFyZr1orcfM2JtvQ4Kvut3zM10jp8crnnNqUt6LPTY1PPM6XF03JPI8+X13x+PlfbTY/2qjO0c7M+A9sdjVcJjZySe5Jv0aP1ftfBqad1lbQ+Qe0bYSqUakqcVvWuvM68PJ61w8nhmeO4+DteG1s0cbV11Rv7Rod3Vb0T/I0Xkz6eN3HwssfWkHfwslrXiw1azWgbvnxCLQbU+nE5JPdWT913Rw0nao7feVjki71M9HqUhWkt+NTg8mJZveXE4nnTavo7GVO7iixS2fMj+BlbUxKnZ5ovkhncj6kU46DiVX1Jx1Km1ILi4BsnAgAvAjKAqAFAAAIjGpQAQ1YFwFgAA6ghQBCsl+gC3UD4AK1QCGVUAAACACgAAAAHqAAHqAAAAAAAAAAAABAAB6j1AAeoYAAAAAAAAABD1AAD1AAeoBAKAAAAAAAAAAA9SFAeoIUACFAAgAo4AIAAAHqPUMAAAABCgAAAAAAeoAD1HqAAAAAAgFBCgAAAHqAAHqAA1XkMuAAAEKAQAAGVL/URjdmVP30BzMKzQ6XQRpF46jXRgIBnzHW5AwKNdSZch8AAKEAHUEYFAAQ9SkAF4aj1IABUQBVuGRgCNhZkeZY29SxGdrLgMuYWWRbNaFSqrHYbGo+N1ZLomalClvyUVq3oduobkqVGGUUrshjG5UaWHlKLW81uoww2Ijg6G7KScnm3zdhWXdYSG9pnI6WdSdbEJJ3VyO3x2O2a3eYekm7tfXNmtsWMZ4+CtlzODaVS8nHqTZSr1cRahFyatexMviY79n6z9gOBw0cEq29Bzbu8+B96wbp04K35H4+7AUe1+zcJDFYHDTd1dJSV7fE+gYH2h9qcDKFLaeEqwjpvShofNzykr7WHHcpH6MnVpuOTVzUqvLVWPE9ke1a2tRTfhlb4nplWcs7mffbp/FY3JWtloatacY5N/E4cTi1Tg7s8D2u7b0dmSlB3k7Z24IxlnpvHieyxc4O+Z1tdp3SasfFtt+1jFxk/s2HdtE76nSr2mbaxTcY0amtsk2Nb7S6nUfcMfRU4O35HzvtpgpSoVPDnnwOiwva/tLO0lSxDjb/AMtm1U7V4qrR7raezqjTy3lBp+Zn9a1bHw/tPgnT2jWoyW6pNzj66nl60JQqOElofVe32z6eIpfb8ElPce9ZLPqjwG1cPCpQjiKTVrHv4s+nx/J4bu10umTMZZSLe7JJfA9UeBjdXTM01vLzOPiVrPJ6gZP/AFJJ8UWhq4+omn4aiXmSXgqKSeXQNORqztkYy8zmq+KKnz1scLS4XKmmOavmXLLMnFh6gpo8nkOJPkEwfrIxACgACKuQ6EKABOJQKhlzMQAAAUfkMyZi4F5AgYFuhd3IAigLkQCgZgDVBCmWgAAAAAAAAAAEGAAFwAIUACFuAAAAAAIAAAIUEAFAAhQAAAAAAAAAAAAgKAIUAAgAAAAAAAEAAAIUCFAAAAAAAAAAAAAAAIUAAAAAAAAEAoAAgBQAAAhQAAAAAAACAC8QLAAAMuYEKEgtQBlT99GJlS99Ac2V7cC8LksPXI0h9QrheQtyYB3ALw1AhbDz0FgbR+diksuZQJqXIDK+quAAAAhbEAt3YmfMFCpmAAi8CFJICFRGVdRErKPXIzhqYJ3yS1OfC0ZVq8KcVe7NJp2Wy8OoxeJqJqMV4b8WbeFp1J1N+XvzdllojOUUoqLtGnTVkvLicuzZKpJ15u0XlFdFxM7dJHBt6bUlST4JWSOrwsIrEQ14uT5G9i5d9iKtSV7RVlnqzjo09ynKpK155K/AjV+utxviqdbm72axP2XEOb0cszWxMLym+EcjWjTqu0Y3Sk+HEzlNwwtmW4/R/YjttsWlhVQxW0sNRlGCspVFFnr/APMsBj1fD4ilWi1fKakn8D45sLsFs6r7NsXtTD4NYvaUYRqXnJtqKfi3Uul+p5DY8dr4PtH9p2Pu4OFWolCjSqOcGn913zaz4ngz8fG9yvtcfmZY2TLF+qOzap4bEqdFKN3mkfSsFPvaEW88j5D2GrV8Xg6darFqcfDNa2ksmfXezNq1JQtojzYSy6e3lu5uOq7Q1u6oTztkfGO08Fj8dKLV87M+u9v/AOjSqRT4HyzC0Z4jHO0b5kznZhr17ddguzWEnJTq0oOK/Fojt4LYmAptOtThuq/ghlbzPMdrMftLaXaSn2R7PSgsVJXxFaT8NFa+rt9DxPtW7OYrs5tGps/G4vHY3GVKFOdCtOolFr711+SV8uJ6OPguU3a8/P5OPHeo+q1O0Wzqc9yOKgrrLeaRnHbFOskrxkvifnvA7HxlbBYjFfaKtJU0t1p3TfI3+zO1dv4Gr3cqNStSTtdEz8fXcrPH5nte8X2fbGy6G0aEpUoxhO2qVrnyftHsCtgKladOg50Zf6lJLOL/ABR/Q+q9jMZidoYdOth508vvI2+0eyqdelJuKTS5HHj5bhdV05uGZzcfl3F04wrzjCV1fLKzOBq76npO22Ajhdt1YWSu76WOrw2BlWlZNersfVx5J67fns+K++m7srYdDE7NWLr1nFyk0o34HUbQw/2bFTo3uo6PofQ47MoYXs/GnFqVTc3pS/Q8FtmLjWjL8StfyM8fJcsno8jhxwwmp24sKlOEoNXdrpfMipqSdNax92/FcjChNwqpxeesfM3MXTS3cVTj/TlbeXJnavJO3BRzg4NPX4HHONm1mbW7HfjKWSf3v1GIp8Y2y43Eq2NKSfQxzOSUXFu9rmOuppmzbC7KWwtmATHQJcBYAFyAdgBLgWAAAAAQC26k4WFuIAXD1IUAQpGEF0CFwgqgAAAAjWBCmWgAAAAAAAAAAAAAAFgAAQAAAAAAAAAAAAAkAAABC4AAAAAAAAAAAJAAAAAAAAAAABCgAABYAAAAAAAMAAAAIUAALCwAAABcAAAAAAAAAAQoAAAABoAAAAAAAAAIVLqAAAsM0wDugxmxbyALUFv0IAMqfvoxMqfvoDmsGssxxK+eZpGKWRbJhoLJgMiqw1YXoBCh9RxCHxGY9QAd+YytmTMoUIUATIWLxzGvECWK8i26BoCIFXoM/QIhG3xMuGiMXnkBOJlHkkRdczODssn6lhWWnu5vmdzs3DrC0VOcU6k18Oho7Kw/e4iO8rxWbO8ilUTquLtdKC6cxVwnbgqvegoN5y1ZyQnGnhJSSsmt2HkSvFRjaS8c3Y1dqTUIU6SyjGNyR0+OGM4ynuJ+G7cmZyn3l56RjlFGhScpy3d5Ri/e8jagpYmW7Dw0aSzfMlZ3txyhLus+Lues7NbAeKlho7m9KUloeRxFberQglaO8vgfcvZDgo4zH05TimqcVZdTzeRlccenu8Hjmefb2GwuzFbB4BTw8MTTqNZRpvLQ2dj9jVKu519j06lSbblUnCMXn5H0/Z2CgqcEkskd9s3Z9NNNxR4cblX2svXGfHmOznZXD7K2fJUcPCjGTu4x0vzPUdlqTp1JXtZG5tDchS3FZZGOxobtKcsyX/Jzt/q8f7RpJznHieQ7N4SP27emotX4no+3tS+Iav5nTbAmlXVuZm5f2dZh/VjiOymyNn1cRisPsenUr15yqSrKb7y743Z5LtZsmptWMKONhWqUqbvCNen3jh5M+yRpwq0Vkr24mhisBCbs4o3OTKJMMb9j4BW7LuThQowquEXku7Sij1XZ7shRpwi50ornlmz6NW2ZRi77qNes6dCLSSVjnlnlW5xY/jrcPszD4SnanCKsuB1O2l4WrHbYrGKzs1bzPO7WxWTzXxOF7rWtR8J9rFHd28rR1WZ42NVUq7pVZbsbcT3/ALQN3F9powsmopXPF9oHsue1qEHKoqUFu1500m2+lz63Bd4yPgeVPXO5R6HZeNjVwjw/eKUdzJ3/ACPL9pZJYihS4qLlL1Y7Nwr06tTGxv8AZ4zUJX5s1NtVu/2tWlF3jF7sfJHXDDWTjy8tyw7ard1bis0dvsatTqxlh6tt2orZ8H+50zyd0Z4eq4SurnZ5pdOwxNKeFqypVFeDyV+HQkJRa3Xd2y9DfqOOPwCnk61NXd9JpHWtSg1OKdlk09URtjUjFu2l9Ga7ir+RuzUZRva6tnY16sXFp3Tvx5m3OuO2dhYufIgDgE2GNAiXYCQAgACjAACxLFDAnAFIEAAAAAEsUAAAAoAANZAAyoAAAHEAAAAAAAAALAeoyAC4AAAAAAAAGQADQACkGQAAAAAAAAAAIABoABSDIAAAAuAAAAAAAABkAAGXMAGx6gALgAAAgAAAICwAADIAAAAAAIAAQpCgANBkAAHqAAAAcAQCgAAAAAAQBFIPUC2BPzAD8x6gALi4fxHMBfMyp++tTHqZUvfQHNwLlqEPiaZXLQgAUtfQLn9BkH6hAdScOIAuQJx0AFsCXKFB6gBDOwzHxHEC+bF87XyBMr6gZWy1CZjxJf0Csn0MQ9Mhw0uAVrmcTDj1OSKvOMFmaZv13Gz47mGUY/6lTK/JHbqMVCK4RWV+CRoYSK3orhbI5sXVVNNJN5Z5/Axa7YdTbhlUjPESqPNJ2idZtOo6lVR+JyutuwSu7LM1XCdbEKEbtuw2xldssLRnWmqNJN395nYYqMMNQjhoXSeb5vqbWGw9PBYS7dt74yf6HV4qtvVnZu71ZD/FpVG3VUkskz9H+wdRnSdTLNpn5wrPgff/APDbjY1sM6UpeKDUXnyPN5U/q+h/xmf/AHNV+k9mwyjmd9RqKFP0Ok2e13cWjdqTe7ZM8My1H2s5usNpYlb26nmzscKnDZt7WujzW069LCxVSvPdV8mbtbtPgKeyoU+8hktTMvfbOWF1NPGdtpSliZWztyOj2NWnDERU1bM49v8AaXC4naip02pK+bTObaOJw0cPTq0mrrPIx+ul3I+hbOblQjZ/scmIXhfG3Gx1vZvEd/gKcumpv4qVoPxG2Mb26fH1N2+Z5bauKldq53m1pqzs2eU2m73zOWX16ZempWxLabuef27jVCOufA7DESsnnoeU7SVd2lOTeiZcMd1w5s/WbeK2hGGP21XvJ+J2ujyu0dl4atttYLZ8PcW7OTd7y4s7TD7awdDaFdVaqhPeebWRo7Ex+CwFatj8VWU61WbcacM3rxPp8eOWMfE5csM/rs9vQobK2FDBpRjlaMVq3zZ4aS8d+Z2G2No19pYt4is7cIx4RRoz1j5HfDHU7eHm5Jnl/X443rb4Ejbev0LLUmjudHONvZuKdCvm8nouTOwr925ucfDGa0XC50SeZ2GFrKrDu5ys9E+XJma3L+OdQ3I3dpRejX8yNeVs4vhmjNVJwm7NqSyfmSbhJKdmnxtoWM2OF+ZDKSSevkYmkQFMWBSAoViC2C1CAFgAIwLIAQqIwAAChUTyAQyAAUAAQAAGsgQqMtAIUAAAAAAIEKAFwAAAAAAAAAAAAIMBAAAAAAAAIACFAAAAAEAAAAEAFBCgACACgABwAAAAAL5AAAABCgAAAAAABAAAAAAAAAEAoAQAAAAAAQIUAAAAIUCFAAIEKAF8gAAIXhYBlbqAOIC3FAAAr8AtAPmARlT98x4GVP30BzgEzvc0ih5hk+YFFyWz1KAV+RH5AeoFIPULyYFAQAAAIDrYBZhT0DzFr8QkA4jO+RUsmxbLiBiA73yYVgLBJO5z4ePic9N35nCtTdw8N5wppdX1LtNdu3pbsN16PdRpYypvVLXy3bv6G7iIWvJq33UdZKfeTnO2UpfkjnXW9TTWldvditdDssE6OFrTqVbSkskuGRoR8NS/JnFiKjbsn5hjem/isZPF1nOT8K0XI0otuo5PMxg3HD34yZjBtM3OmL3Spmz6R/h52x9h7YfYqkrQxEbx80fNXkzc2HtCpsra+F2hQvv0Kqnk9VxXwOfJj7Y2O3jcn8fJMn9A9lVFKlB3vdHb0o79lY8Z7P8AalHamwMJjaMt6FWnGSd+DR7DDV1HifJ/xun6PLPc3Gv2t7L0NvbFqYKrVnS31ZSg7NHzzbXs/wAdgNi0MPgtpVqu5aH9WTk366n1n7VDu23JKK1bZ020cdhNoKFLCYyjUlTqJzSmsknqXUXDLk/H5z7T+zfb+Gxir1q2IilK67mo1b0O82RsfbWLdOlXTpUYWu5O8pH2HtLtDZNTEKnHF4eUkkrKa1OshPCxzW76Gbpr1yndXYMJYTDRpPNJG3jcRaDzRoyxtNLwtGhjscmnZ5eZjK1rHFwbRrp3zPO4+alc2cdi1JvM6bFYjPUzpq5aaWOnupo8D27x8aGCqNysj1+1MVGEJNs+Qe0jaXfVI4aEr53kejgw3k8Xmcvrha8apd5VlVnnduTJHW4eUVFavNi9lbifXnT83bausiSzn5F92NvvMwWoIk8pEyszKS3mYTT5DSxg8mZQlZ3RjLN+ZFqRptupvSvz0/QzjJum1+E1Yy6mdN59H1LItczbcU7aZERHa1s9QaYALAjQAAAACF1YgsQAAGuoUGoAEsGV6gCArQCIAgQAAVQAAapSFMqAAAAAIUhQIUAAAAAAAhQACAAAXAAAAAAAIUAAAAAAAAAAAAAAAgKAAAAIAAAAAAAAAACAoAAAAAADAQDiAAAAAAAAAEAAAAAAAAABCgAABCgAAAAAAAAgFAAEKAgHqhwAQAICwDXzFwAFzKn76Mb8zKnnNAc5CkNIZWGuj1HmOADLiMrF14hagTiOJdQAsCh8AiAAACNZltmFRZp2ZbLja5UVZ6gS0dNCpWd01mEkF0yApko8jG601OfCUauJxFPD4enOrWqyUKdOnFylOTySSWbbY30TtwTi1F5ZcT33Yz2Me0DtXseG2Nn7Kp0MDUW9QqYuqqXfLnBPNrraz4M+6ew//DlDArDdo/aHSpzrRtUobKlZwpvg63CUv7FkuN9F9+xNSN1TwlJuKVk7Wil0PJy+R6/Hv8fxJn3k/C1X2G+0yk3fs9GUV96OKp2f/uNX/wDTntts3Et43s/XpqNr2qQd/hI/aXaDaW0Nnpz+ySrU0s1DN/DifIu3XbPBSi68qihOb3Nx5Nc7rgccfKzt09n/AOfx63t+ctqwnh96hWW5Up3UovhLkdPTXgv8Dse0GKjW2hi6sbtTm2vI66jPfcYLJWuz3Y7s3XyeTUy1Eq09ynvvK+hpS8UnmdjjIvuo31SNCMbuXQRzsXWklyEU3a2Yir5G1g4Xqej+Rv8AHP8AWq4eE407SNma3U9DWfMg/RP+F/tmnh6nZnF1LVKP9TDXfvQeq9H+TPv2Lxk6WEdSm7u2SufgjYW1cVsbauH2lgqjhXw81OLvr0fRrI/XXs97ZYXtTsKhjKMkt9WqU27uEuMWfP8AJ4/W+z7fgc/vj6X66Dt32r7Y1JywuH2XiqdB33ZRyUvN3PAvbvaelGc6tGok8moSzPvHaLCrE4G0Uk0smuB8+xah3nc1u7yurNanDHLF+m8bjxyx+6fKMZ2g2xKu5qji4xTyyO02P7Q9u4F91iO+qUlwqRbserx2EwkY1Jypwve8VlY89Twqq1rRpp/JHT2x18cufh9fuT1/Zbt09r1u67irG2rs7HpsXjN6F97hzPNbDoUcLhbU4RcrX5XZuYqs+4Tkt12zV72Z58pLenhl0xxmM1s/zOnxePte7Rr7QxW7J55nmtq7RecYu7/M1jg5cnLIz7RbV8LhCV5PSzPmXaJupi1vPN5tnrMQp7sqtTNvnwPGbbrb+JklnzPXwYar5Pmclyjr770m2VNJ7zRIrUnE9r5it3d2RsktMiLRsLIyjLxa+Ry7qmkm1F8+DNaXQ5Kc8nCSuuBrZphVg4O01Yw4mx3kklGVpw5MtOlh6st1VHSnwUldX8yNRrJ5mcLX1FajUoytUjbk1o/JmMdUSDYWiKVJKKzQRraURDKwQRB6FAWJwIUjChLdSkAluoyKGugE1ARQICoWCBOJbBrMCZshkAMbC2RkQCWBboAaoIUy0AAAAAAAAAAAAAAA9QCAAAAAAAAAAAAIAAMgAAAAAAAAAAAAAAgAAFwMgAAAAAACFAAAAB6hAC+pGMgAAAAEAoAAAAAgAgAfmAAA0AAAAAQoAAAANAAQAAAAAAAAAAAAAOlwVAOOYsOdwtdQJoBxADiL5AcQBlT99GPAype+gOcAGkSxQAgXImQApAALYBAAhZAcQHmAWwUjqVEXwLHUIWfEjXE5Et7yufoD/Dl7CMH212Ku1vamtiFsqVWVPCYOjLceJ3XaUpy1ULpqys3Z5rjjPKYTdbw47ndR8O7K9nNt9qttUtjbAwFbG4yq/cprKC4ylLSMVxbyP2x7APYpsr2e4WO1Ma6O1O0dSPjxbhenhk9Y0U811lq+iyPoPZbsr2d7L4H7FsLZGD2dQyvChSUXN85PWT6ts7xKcoZPu48+J48+e5dR9Dj8eYd3648TKCzrT35Lgzq8XiMQ791BRilyNnHVO6g+5jG/4pHTVcXVqRcXXs/I8uWT38eF+x5raPamth9oSw+0sLJUm7RqpXj68jpO2nZDs32uwO/iMJRnVteFWKtJeqzO+2tgZzU6ilCrF6xkeD2piMds6Tr7MvOld71G+nl+hnHLTvcd/X5y9pvYva/ZTH1XUpTrYGUnuVoq+6uUuXmeT2TLfxKTTtuv5H6zxmJwfafY06bjF1XFpprRn5z7Q9lsfsHaWIxTwzjg3VlCM4+7F8ny6H0ODn9pqvk+X4npfbF01dSqOfJWVjUjStU3bWudtgoKbrLW9mcGLw/d4tLg80z0PBlHXxpSam0rOPQ2aMNygql7ZM28PGKwuLk45OKzNOdSMcK4RfuyefmarnJpwW3lO2m6+BqRzbT4nPhppzSfFtfFGvHw1kutglYp5nrfZl2wr9ktuRrNznga8ksRTXD+9dV+aPJzW7NrqYmcsZlNVrjzvHl7R+8ey2Kw+2dmUcTQqwrUqsFKEou6knxOfavY3Ze0KT76im+fE/MvsG9qP/ZWstjbXqy/y2cr0qrf+g3qn/a/yP1Hhe0uBxuCjWoV4SjKN007pny+Ti/jr9H4/k/y4y414Ha/s4wFKTlQnUXJN3OmXZSWGlrdI+j4radKd3vJo89tna1GMW7pHK16rvXbzOIofZY2tax020MYkmt/0OXbW1lUlKzsl1PL169XFVN2lfd4yNTF5889dMNqYvebhTe9J8jr6OBnOXe1Vmdrh8FGKu7t8zaVDLNZF9tfHC43LuvJdoXHDYKpN2sonhcbgqkaPfyT18T5t5/ofQO0+FnjMfg9m0YOdSvVS3Vxtw+Nje7VdmVgdkRwyipThFuUl96Vs2e3hvTweRhuvkEVa642MbceZzVE6dWUZ6p2JUilRpyS4tM9T59jgzvYtSyajyWZyRik9/l8zildtviy6TbFstP3k+phJZhOzugrZxlJ0ZJPNTV0a18/qbc6qr4WMX71Pj0NfdW6pLXjctIzpV5wTjK0ovVSzRXCnPOnJRf4ZPL0f6mNWluRU83CWj68jj8jKtulmtyS3XwuXR9Tjw85SahJ6ZK5yy6liMddWCFKBGCcQpxAAAW5gAEh6gWCIHa5WQAtdQgLgUlyrMgBBhEChCsgQAAVrAhTKiAAAAAAAAA0AAXyAAIAAAAAFwACAABC4AAAABdEKABCgACAUAIAgAAAAAZAAAAAAIAKAAF8gAAugAAyAAIMEAoAAAAAAAAGgAZC4AAAAAAgAAQAcAAAuOAAAAAGQoAEAApCgBwAyAAAAAAC6BOwDAXvxBCgLu9xwAQBGVLKojHQype+rgc4ANMgyAAcAAAGYIFX1CZCgW4REUIt+WoWoCasFHZO9iNq5eBOPQI5qbjfM/oX7AY08P7F+yWFglH/APbYVH5zbk38ZM/nbO6ulkf0a7AYOWzOy2xNmQy+z7Ow9F25qnFP5Hl8rLUj3+Fh7WvWzqU4Sy8clwOKrUk471R26GcoQpRvkeI9o3a2lsDZ86rU5yeUVFXPDt9LDDdTtx2qw2yMLOpUqRiknxPiW0/blsilUqRjXaksrJNu54D2o9rNt9oZVIUrwinnBSzsfOdk7In30cXioWgneEJayfNrkdePhlm8k5fJywymGEfoTC+1zD4qap1W6W9HNTyeZ2Wy+1uxpRnOU1aTvKLPgf2O8XUm7vW5wYbai2btGl3taXcudpJu6S5k/gl+O3/Vams31ztzt3CbD2nDbOx60p4Wu130bZf7rfkzr8R2k2TtvZOLoVZ4dxxqimpSVt7ga2OjhNp7GVXdhKEY7s0tJRZ8Y7QYCWy9qVcI23BPepvnF5o6cXFL/wD15fK57h87ld/Xof5dtXEYW7e42ovmnoWU6dSG/UXuXz9DosLjsVWzr1JVWoqEXJ3dlobuIrd3g7PjfL0PXJY+TcpVVePdThB+Gos8+Jpv/wDGnK3vSfwNeEpTjTjGWbeiN3GRjToRvZWiarnI6+jJKq2uBxOX9Rt8zGm3k+MpHG3mWM6bFZp1JeZgmYVH42Y3ZTTmTR7T2e9ptrbOlLDYbHVVTTuqcnePouHoeFuzv+zUJUqaxVrKVTc9LGOSS4uvBllhnuPumye0e0toRjCUqcW+VzscTgcbVhvTqxlddTx/ZSo1OnJdD6pgKSq4aN7ZrkfNzxk+Pu8edynbwmI2ROT/AKknLpwMKeztzJQPeV9np5JK3E1KmAUVlFNnO5adPSPL0sI1k4kr4ZxWR6CWFa+67mGG2TV2li3QTdOjSpyr4qr/AOXSiryfnbJdTGO8rqLlrGbdb7KthUtp7a2p2jxEHOGCmsHhLrLftepLzzS+J2PbvAwWBrVZRtGMW2/Q937KdkU8H7ONlJUI05YunLGTitb1ZOav6NL0PO+2iMMD2WxMr7rqLcVlzdj6WGOnyOTPe35O2lhqirVKsVdNtnHh132HlRfvax8z0WLwdBt/6nwR0lbCTo1vBdRbyfI9LwX66681LirGUXCXv02usTdr0JuKm47s/wAS0kYYdPftVUV1aNRNNSdNPKLduqOJ0Z2yVzvo/Y45z3bcbJ3ZxY7FbPeGdPD2c27e5mlzFpI6aEKkXdQlbyM4xeqTt5aHr9jwwPcKGH2d30nrUr8zuKPZjDYxKpVnhaLedqWHm/0M703MdvntKN04xt4lnGWjMXhk/FTvlnKL1j+p73HdiHGTnQqU5R1StOD/ADTOh2ps6ps6svtmFrwinaFTJ/miWr6V02IwslRjiYRurretwZG9+Kna91nkd7gqmCqRcKji97KSlG1zWrYB0W4xe9TlnCcc7FmRcHUSVvUx6GzXouFRxlF+iOBxks2maYQl+YHQAi5EVugWa4hFBb2fMxYUYytcnC9yXvxGhVYga8hxABdGOOYAdQGQC3JcAIX8gwAAACtUpAZVQQAUAAAAAAAEKABCgAAAAAAAXAAC4AAEAAFAEKABCgAEAACAAAAAQAoEKABCgIAAAAAAAACFIUCAoAhQACAAAXAAAAACFAAAAAAAAAIAAAAAAIAKABCgAQoQAC4AAXIABSACkKAAsCAUAPoA4GVP30YmVP3kBzXuCcBxuzSMug4EenFBhS3MOxchlcIgBUAAABajQACi65ky4hagZalWbsYZdTKna/kB2fZrZb2x2l2XsqN3LGYyjh1/1zUfqf0cw9NQqN07KMHux6JH4a/w37NW1vbT2botXhh68sXLLRUoSmvzSP3jClu0WeLyu7I+n4XWNrrNr42pToylvZo+A+2DbWJc2pYlqnFNtJ6n2ztRKUcPUSdrpn5m9qlCM67qynUnLf8AvSukeOd5afVlkw3HhlCVarKpJ3cndsxr4Xdamk3bXqbuHhamrGdWS3LNJHbdeXr7XWbQmqeHvGV1u5Hhto1HWrObbavZHo+0WL3ISoQfvP8A5PMV2rpaHr4cNTdfN8rl9stRubL7SbW2ZTdHDYj+lpuTV0YbX2tV2xDDSxMF9opRcJVFpON7rLms/idXuty8zcwlNKd27pO2XFnWYzbzXPKzVrlwlKW+lFaWu+CMcfU3q25F3UfD5s3qk1h6LhTi3OWivxNFKDbq57kcov8AE+LKiYdLvoR5fmzk2lWc00uL3Uuhx4SSlVlVTsoK0b8WzjxcldNPy/Uuk24W0pZaRRwt5mba3Lc2YpXaSV2KMqvvv+cDE5MTTlTqtTVn5nGQD3cMEsN2ZwVotN0FVbkrXbdzwiV3bmfZu0GAcNh4Ok4//wAeKj0ss0Yyrpx477bnYpKrh6U0+CZ9X2FU/oRTZ8Z9mmKdTDuhL3qcnHM+ubEk1GOZ4uTqvr8P9sdvR91vLTgcc8Ld6G7glvRVzacKerPNlNvXLp5zGYXcXhg5Sk7Ris23wSPS9o+z8+znsk2vTlFLam06McNOS1jKtJU4wXkpP1ueo9nfZ2GKxH+e4ylejRbWFi170+M/TRdfIy9p7dfG9mNlxV1ituUak484UYyqP80j1+Pw+s9q+f5fke19IRwFLAYengqEUqWHpxowXKMUkvkfG/8AERi6ccPs7Z0lJqrUlUmo6tRVvmz7xiqd3JyVne5+c/bZiaWN7a1aTW/9jpRpLOyTfifzXwPVJ28OV6fJcRCm5NRobq4eNmnVw1Ga3XTnf/d+x6GvQg3ZU6bvmrrL5nGsLHXuKTt5/qdHned/yqm1lGs8s/EsvyONbB3pLuqdV8cmmezwWEqTd6WHhbi93T1Z3GE2Xv7sql59FlHy6lWYvnmD7H4naFVRqOUIXzd+B3c+yezcJtXZ+zqFGnaEXiKrkt6Um3aN38cj6LhcHTowXhhdNf7V58300NGFK/bDFVakZz7vD0oxjPVt3ay5Zhr1bWzNl0qFNKFOPeSslaPuJ/U7uhs+FGKpwinVeTk/u9P1ZyYJdxB1Kl+9m8stOb/Q7CnTdOKpRjJzn71uXBEdJNOvo4C8rUVvNK7lL+aGa2ZQrvcxGEw9aDyalDeudjUnBLuKeSWdSa0bX0RZVqFPCRnGbtdxk9HdfQzpXhO1Hsu2HtHeq7Pk9m4jlThek31i9PRo+Wbd7G7f7PVKjxFJzw61r0U50rf3cY+qPvuO2zTpYalO8ZJTlB3zusmvmauI21hp0adWEoxlnGSfS36kNR+bq8HOPd1aUU+EovKXrwOuqU4qUlCThLimz7r217IbN27RqY3YVOjhNoZSlRjaNKurctIy66PjzPje0MFLvZ05U5Qq024TjLKSa1TXMuOWnLPF00ozjrexjfPQ5qsJ0pa+Zx2Uuj/I6OSfIeuoGVswp0zRPUO2pBQv6E6ZB63IgLx1GQsACstBkQAGAAAACAACgJdAI1wAZaAAAAAAAAAAAACAAAAAACAAAAAAAAAAAAIAB6gAAEAAAAAgFAAAcAMgAHxABABAAAAAAAAAAAAAAAAZAAAAAAEKAAAtYZAEAAAAyAAAAAAAAAAAAAACAHqAQAAAEAFAAhQFbRgEMy+ozAmYHqL5AFz4BgAMjKn76MTKn76A5bC2ejLYvE0hwA9AAItS+peOdwJmXgPiR8Aghx1AAAEzAo4gcc2FEZR1szHqWOquLR99/wAE+y/tPtA2ttZxvHA7O7qL5TqzX/1hI/Y08qVr8D87f4H9kql2K2xtVw8WL2iqSlzjSgvrUkfoPF1NyDzZ87mu831vHmuOPK9r5R+zTvrZn5w9pMHPvnwTuffO2daU6coqVlbM+HduYxqU60Fo0zh17PfJ/R4ylTi6UXHO5pbVlGlC90bcKijg4u9sjynanaVo7kZeKWSPRjjuvDyZ+k28/tKv3+MqTvkskaFV8eRyOWT5nBVk5cfJHvnUfJyu7thTtvq7suLudts+KVPvWrRS8N/mdVTit/xe6tevQ2quJbaSyS4LRERzYhutVbcrJavpyRrYue7FQWUUrJcjmpp9y6tTwr7q59TTxNXvKl17qyQVlQnaO63ZGNee/O6yWiRxxyyLJ5FRHwQi7TUuTGiuREG5tZWxUraXdjTN/bSX2hPS9vkjQLSOTDR3sRTjzml+Z+lO02zd7YeEqKOlKL05qx+bcEn9so8+8j8z9rR7OT2j2RwzStfDJXa0djlyPRwX6/N/ZrEf5d2qr0XlCVT55n23YtVOjCSzPhPaKlUwXbXF0akXTqRtdcmsn8j652D2hHF7Pp3fiikn5nk5p+vpeLl+Po+z6ngR33ZvY9fb+1oYOneNGPjr1F9yH6vRHl9mudWpTo0ouc5yUYxWsm8kkfoDsd2fhsDYcMPJJ4up48RNcZfhXRaGeHj97uuvl8848evrnlRpYTB08Nh4KnSpRUYRWiSPDbSksb7Udj4Z2ktn7NxOLa5SqShSj+Ske6x2juz5/sCccV7Re1WPWccNHC7Pg+TjB1Jr4zR73xt7d7tJwpwnOT3Uldtn5Q7TYqlj9s43GqkpPEV5zcpt8W7ZLpY/SftFxrwnZXaVaE92fcSjF9ZZfU/N1enTgrQpRVlnKfid/IRcvjoZJqpdQo24eBX/ADNvCwxc5pU4StzUEretjsKdLGSjv03KEba2UF8cjawuEnNb1etUqPlvO3xZpiRwYfDNyTr1JVGtI3vFeb/Q7GjRm5r8LWSSza6cl1OaFKNOCbss8lbXyXHzM69XD4aKnjK0aEX91yW9LzfA018clKlLvEo7rlHRt+CC+v8ANTrsNSS7a4i85SVSlTk6klraLvY48d2u7O4Ki1iMfSk6b8NGk7t+izZOz1fHbW2xLbWIwUsHhu6VOjCot2c1e97cFnZIlOq9VS3ZVZYicPDH3Y8HyX1OWlOdOnUrzleTbin1er+BwY+qqUIt2vC6ef32vodbisXbDOTmrXeXwI1XZ4jFUqeBnutRd4ts89tHbChgaijK73vXQ6rbm21SwVSO/ndJW9WecbxuMordhK0pctciVNt3aG1e8jGCk85tq76WNGeJrSlRpwk/Fd9M3+x3GE7JYqrGhNpuMo7zXFZndR7LQw9alOpfOK9BpO3QUq+Nw3dzUpe6r+Sbt8jr/aXsuG0sLU25gIqGMw1NTxMYr/Vp2Xi/3R+Xke02vhaFGhSXOn8c2dJia0KO0K0VaUY093daykslZmbGtPik69HFXTSjUtrwZpVae5LTQ7Ltfsp7G2/iMGn/AEXapQf9ks18NPQ6+lUlNd3PNpZM1j045Rxt36kdhLKWa46mLeZthbgl0S4UeoGRAKQAIqIAA9QAAAAAABUsCAI4AAjLQAAIUACFAAIAAAAADAADgAADAAhSFAIAAAAAyAABABABcAACFAAAAAAAAAC4AAAAAAAAAAAAEAwAHAAALgAAQoBADIAhwAAIC4ABsXAAAAECFyAABAAAAFxcfAALgAAAABCgAAgAAAAXHoBb5jgRvQa8rgGwuQuAF3YIhUA4lp++iGVP31cDmTHHUhU+DNMr8xloxexL9AKrDIl7hN6AVjzJm2XgFLgg4gUAZ8AACHIRFSI2k76mcUbezdnz2jtHC4CjnVxNaFGHnOSivmS/Fndfun/DFsaexPY5sKlUjariaLxlS/OrJzX/ALXE9ttnEbl89TfwGAp7L2Nh8HQgo0qFKNKEVwjFJL8kdDt6q92Ts+R8vlvb7vDhNSPEdr8dJU5KGrPkvaOpKo5KejPona/HSo0ZNRjFccz432n22nvqOTdzljLlXrz9cMHntqY2lhcDK7tqfPsdWlisS6k+Oi5I3NsbReNxDSl/Si/D16nXS1Pq8XH6x8DyOX3uo46iyyOKot2MfM5mrp52RwVneSeiWh0rzI5aZWscuHjGVROppfTn+xwvJrRsyUnFXvroQc2NrupJq+SyNXIsnmQKqeZXbd9SK2Rla8G+TQRi9CBjiBtY+u6qpOUUnuJ5Ppb6Gskc1dt0qD/sa+DZwrUtG9sGmq23MDRs3v4inGy6yR/Qzsdhe/7MUaTird0rfA/Afs/w7xHbjYtFJvexlP5n9GuwuDcNkUabWbjpbQzZ06YXT8p/4kOxuI2d2iw/afD0/wDu9VdziVFe617s/J6P0POdgdp/ZsaqLl4KmnmfsXtv2a2f2i7N140FQxtOdOajuyUoz1Uldeq8z819gvY32kq9pVU2rhXg9iYTEOVStVqqFStRi/uLN3el3ZJ3OGeG+ns4uT17foD2E9mnVpx7TY6m91XjgoyWTejqfRer5H16o1unUdk9obJx+xqP+T7sMPRiqaopWdJLJRa/lztK8t2DN4YzGajz82d5Mt11uLlDe8bSis5N8FxPlfs2ryrdnqu2ZJqe2cfido567k6jVP8A9kYfE9D7YdpYjCdjMXhMBNx2htWcNmYK2ve13uOX/THfl/0nFs7B4fCYTD4DCR3cNhaUKFFcoQior8kaqSPJ+1zGJdnY4ecrd/VirLjbP9D5N3VTWCVGLV21qlzvqeq/xGdo6Gw5YRVpScaVNz3YLOU5OyX5H5b7V9sNsbcrulCrPD4eSs6NGTtL/c9WdMZ0znlp9lrba2BQlNS2jh69SD8SVVZebudLtP2jbJwjXdV6TkslGn4/2R8mwnZzH1KcqlWLpxUVJX1d9Ddqdlq39KlRi51am6opc3wNac/evZUe1naHtJiK1PYGFlFR97EVHZRfpxy0Nih2IxuMxLrbf2pXxc42bhGbUd552PVdiNiUdg7Fw+CjGLqZSrSX35PV/Q7jDR72s6iSTk5SfTL9w1Md/Wn2W7JbGwWKjUo4Ogty8pScbt26/A7mviqbxbgmmqd72asuSODEbTpbPwGN3LyrSpKFNLi5SSOuqy+xYGlCbvVk5Sqyf4srkt23Jp2eOxEfsyjvJ+Nt/A8v2j2rKlg1Tg03Kcsk+iG19p1p4eGHwybblK8vgjQeBhSwtOvjZrOcm2/KJktamA2RjtpKFaomoSq8fI97RobM2RsahXxc6Ud2c4yd+SR4TaPbKbwtHZWwMFWxWJjOUnGjDetfLNrQ6aWzMdi8TTfavbtPA4aN6jw9KXeVL8rLJP1Y0zvXx9ExftAw0vsmF2HhZYmo3KKSj/d+ZtdotuV8FgcF9vUYYuUZSlCL92Lfhv1PFYbtHs/ZcaeF7L7M3HFbixFTxVJX4tnDDA7T25tPvsVUlJzmo3dxVlrn2lt3GY6vSoUIuSjFXt8WcOzI4qtGvXxN7ztZ+bv9Dv8AA09mbOrzm92clCT9LNI62piqcqahTVlOWVnyyMNR5H2vYeP2LZuMst6LlSk+NmlKK/8AkfPISldNarTqfT/aZTeI7L16zX+jiIST6Lw//Y+WQeZqOef1tztUpKpHXijiGFnabUldcizVm1wNObFly5kuCi5aEFwAAAAABQEADiVEsEBQwRsIgAA4AQploAAAAAAAAFwAAvkAAQIABSFAAhQAuAAF8gAAuAAFwAAAAAAAAAAAAAEAoBABSFAAAAgAAFwAAuAAAAAAAECFAAAAAAAAQAAgFAAAAAAAAAAAAgFAAAAAAQoELwAAAAAOAAAAgFV0CFAgKAA4AegAyp33ycOJafvoDmWQv1JqIu76GkXqS9si2z0D0zAJW4+gfmTXiX0AIZBACkvxGhQHoEArtgFk73ZVfmEyrW1gEb88j1/seoLFe1TstQdrPauHdn/bNS+h455HsfYdOUPa12aqRhKahtCm5WjfdTdrvkrtGc/jfHP7R/RTGSvh4JP7qPMdoKO9Rkt5rLVHoaVWNajDmkjr9sUlKmz5efb7eHXT4l212dv4arU+2VY7qeTs0fn/ALYRlQwuIrOo22nFPqz9O9uMO/slaO7ZOL4H517cbA2tiMBJvC1KFDfv3tZbkWul/e9DfBP7J5WX9HyyPhWplF/E5doYV4XEyoue+lZxla28jWb3FfI+n+PhX6tSXitwT/M46rWTWrepfuJtZkq5pWIOJl4ojM5Z0o9LogwvncLXMjKuQVePkc1CKkpx5xyOKS0elzYoxacZL8JZEa1syGc8sueaMeJBzNXwMJfhqNP1Sf0ZxcTmw3jw9elbPdVRea1/Jv4HCs2ij3HsMwjxntV2BSirtYnft/ti39D67/iY9sO2JU/+yHZTF1MBsynejjMVQlu1MVL70YyWap8Mvez4ZHyL2KVZ4btt9opvdrUsBipUpfhl3TzXlds3/aZs+f2fCqlBznvx881ZfmS3tuS2Pof+Dz2g7d2b2oh2HxO0Kc9gV6NeuqNbN0aijvf0nwu1nHR3b1P0li8RiNpYmTmlTwscktO8txZ+KuxO1tj9g+2GyNqUZYnaOMwk5x2iqaj3NpRcWqT1k1f3nk2fpDZPtk7G1oU6uI2jQaa3lRblCV/wtNai4W/jphZOq+vdlNm4mjtNbSwlR4emo7tS68NSPK314Ho9m9pdkbcwuKqbLxtLEPCV5YfERg7ulUWqfzT4nx7tH7SYYrZ9KnKrT2PTr3pwhXrRpOTt7qzyeavc/PFL2mYjsD7Vq+0Oy1eOPw1eMY7Rw+/vUsQ7tyipLld2ktM+GudLl/uv1Dt7ET277SIbjUsD2couK5SxteOf/opfB1D1mzqCcE2eP9luO2Pt/sNgtsbFxUcVPGVZ18fO1prFTk5VIyXBxbUV/aonru02L/yHsbtDaTdqlOhLu/8Ae1aP5tEkX8fln/ELCv2pxW1K2DXeTw1ZyoJP3ow8Nl1aTPivs8wdHFbXq1cRFSjSp5K3Fn3CtOPg3/ek+8k3x/mZ887YbLWw9qz2vgobmFxrSrKOkKtr6cE/nc7SuOc729RtfCYanRnCFKKe5HTh4UcvZrZsa3aGnUlH+lh4x9ZNZfU6jC7R+2qyleUox9dD2Oy4LBw3pWjOdRSk/kVZ22K0rYp7qskpZcsmZYzF4bZmwMTiqskpxi0ueqOKO7KpOT4QkfNPavt6e5UwVGo42a8K0zRlrK6jf2NtypjcbitqVYOrRpS7vD0/x1db+STXq0dpWeMq06VTFeCbTk4vhdml2NhhtmbEw8JwVWrShvTk1lvPOT+L/I1tr4/ae3drPAbHhB7tOPe1JO0KS69enEmmfxs7U2xhsBh6XdxlVxNRyVOEVeUnlkkdRjMPjMdQoPbuOqUIzcpwwWGs6kk396WkdNFd+R6fYvZXuk40Kku8aSrYqp78m9Un92PRetzsK8+zezcc407YqqkqcWlpGPG/xYNX9eboYHai2TDB7Lw62fhpVLJQVnUeecnrJ9Wc2D7IYPCUpYja+LXeVnk5Sz3Vq/oc+2O1OOx1aOG2PhFQpJbkHu3aXM66rsvam1a0VOpVqRSUFe+f8YXp2VLH9ldnb9WhSdeVNOMMsnL9jrMV2ixlSMqmEoLDRleFOKWavq/gbs+z0KE4UZKO5Ty83xfxGOw2FpYiNBSi9xbsc9ZcTK9uipUcTKi5VpzlOo8s+CO52fRccVTjP3aUbtW4pXf5mE8ThnilG96dNXy5L9Tjjjl46kY2dV2v+bZmtRO3VOnHsZjYJq7ob8r6334v6I+LrU+pdtMRUxXZvGyd1FRVvLeij5caxcs/rOjlJnNLOztqjipLJszV7WNRzqAEKqkAApAAABQI8hcAAL8iAIXIAFW3QEAHCADKgAQAAAAABCgABcACFAAAAAAAAAAAgAoIUAAAAAAAaAALjQAAABCkKAAAAAAAAAAAAEAApABQAAAAAAAEAAAAAAhQAAAABAEAAAYAAAACFAEKQoEKAAAAAAAACAUAgAoCAACwEKhkLZXAAaC4DiZQ98xMqXvgc1kGlbJAGkL2XG4vZ24DJ52HEBw0KAAASAREWw4h8wCQ48wFq0FL20RlGUb5mEovh6nvOwHZes9j/wDaOdOlWc6kqVBOrCPc7vvTvLJT4R5ZvkFk23fZr7J9udsMXOCoTpUqSUqrlLu1TT0dSbTUMtIpSm/w2zPu+wPZz2Z7F0qNWhCOOxlKcKkqucKNOSesY3bm1wlNytqlE9l7AO0PZbZHsxwmye1kdn7MxeHrVpS72tGarxnJzjUvFu/haTvn4fI9Rtz2p+yvYkJug8NtCvDONLCYTebfnJJfmcOSZZdPVxXHDux3Wy1WqUo7tKclbVLJepw9oNp7I2RhXitu7Rw+BoxWbnNK/Tz8rnxLt1/iE2/je8wmwNl0NlUU7d7Ufe1HHmllFeqZ8Q23tTa219p1a+2No4jHVpZKdabl1Vr5JeRzx4Z+umflW/H2vt97b9l0pTwnZDZVKrLT7fioX9YRefq7eR8U7SbZ2r2gxs8RtXHVcTVd93fl4Y+S0Ovkr0+dnfQsnLdjU4pWeXLQ744SPLlyZZfXm+0WHe7RrLK14y+Z0VVaLqeu27SjPCVlG17b8f58TyVTOz6nT8ciyaa+BxTVpRv6nPbw3XI460XaPAI4HlkFe1uDMqiale2uZjFXkkjKoyx10KovQRV2XRtm14VZcTsMPRbpUnbLcf1NOnByh5cPQ7OlKKwcG9YxaX5moR1uLjGMFbKSfxTNZ69DZxclJb3FO2ZrcTNHLg6saOKp1JK8U7SXOLyf5NkrUnRxE6LecJW8zjjrnxN3GpTw+HxPGcdyf+6OXy3QV3Hs+2jT2R2qwmPrK9GLlTq56U5xcJP0Um/Q+he02lPCKatGfcU4Sd9HKLy9D5XslKVacZcYS+R9qnhavavZGwZSlFVNo4WjSk/7ktyT+KZMp+uvFfx8v2rs6nhdoUcZhYJYDH0/tGGtpC7tKl5wlePkk+Js0Y7rjOOU4tSi1k01mmvU7bsVgJ7YwON7J101iqdSVfZ1/e+1RVp0vKpGNrfijA6peBZ3Vsnc+h42Uyx05eRx5ceTl2ztnHYjbFPbO1q3+a1oSvKGMbnCSzytwXkdLi8Kp7ThT2Ng68p4mnF0Ixk53cveUb6q99dLPXUmNqLEV3GUmqUFvVH/AGr6vT1PofsVorF99ja1CG9h9/uZ8YKeqXJeF/E488xl6OPK3qvdf4a+zvansn2kp1MFjJYiWK3Fjdnp/wBBU75uT/GuDWmmaZ9z/wAQ+0ZU9gYDZFOW79pr781f7sV+rXwOL2C7NjHA4raDhG9WruxduEf3PH/4gdo1MT23jglJzjhsPGG7ycs3+TPJPrv8eArRjWknTdlOShHyRr4rCUNo4KrgsVBTp4mMlJWzV8k11TzXVHPvRjvRjpTjup31k9fr8DKlFd/a9oxtF+mb+RuMvmPZyjjNj9sVsXaXvUndTt4akPuyXRn0TamK3a8LOylGLscXajY0dr7Op1sPGC2pSnKpQno5xWtN9H+T9TymE239tx2GoTjKFWNqc4SycWnmmi3tjH+t09tjK6w2DxFW6e5Tbflc+MrA4jtP24WCg33MZOpWn+Gmndv6Lq0fQe2m0/s2FklK28nFrpY8Z7NdmYja+0sbWqVnh9nbtsTUT3XUtmoJ8Ob6eZJFzu7p7jCYBbcxUMFgpVMJsig7Vq8ferNaqD5c5GxjtrbB7L0oYHD0acJzqb8oRzk+V3z8y7Sr4zFYVU8DUp7M2ZTgoLEbl5zS0VKHL+52XmdfszZeB2fF43C7LljMVNtU8Rjn3k3L8VtFbyG1R47tP2goyWDw7wmEqTuqtTwprmuZs0Oz2zdkUd/be2Id7NXmk77sdbebOVYTalWn9p2hjZNR8NOkslveXJGvhNgYbFV51sZKVWMHvVJSd79F5si6bsO03ZjZ2DlDZ+zauIryW7TnKPDjL10Ovl2t2rnXw+Ap4emm4048W+fp8zlrYOnPEblOnCM3le2UUvojUxjU68YUo3jHwwS/nqRWhVx218TN161dQUXaMYrWX8zNelhpJOtVqSnOTai5P4s3MVUjOrClTzUHux6vi/iScoTqKnfwQVn5LVmUcUKMYwUEryqO/pwRyOKbdrbqW5Hq+LJCbtOs1ZvwwX86FUlTnHK6pq78yK4+1uHiuyG0FGOfd6/7Wm/mfInqfWO1OLguy+NpTu2sO8r/AHpNfsfKLaM1GM/rlgkodfoXyOTdUUmzjNuYTyRQ3YKxKNdELcQbQoHAABYBAAARktcyBFYvqDIliiAtgBrghTKgAAhQAABAKAAAuAAAuAAvkAAAAAXAAAAAAEAHAAAAAAAAAAAAAAAAIAZAMgAA9AAAHAAAAAAAAIAABkLgB6AAAAAAAAAAAgAAGVgAGQDAAAAAAAA0ABDIBWAZDgAAAABAAAAAAAABeQHEAPMXAFViAAAOBAKuZlT99GJlT95AcydgndEKaZUBDqyC5a5E9CX4FuAYy5AFADgAoS/IoAsW7nu+wWMr4jYG09h99KMH/WjFPJp5S/NRPBqyO97DYv7P2nwsG/BX3qEk/wC5WX52BHtuwWNVbZ9bZVaa38LNuKazt/LndY+FqdKsldpbknxy0v6P8jxSqS2L29pzcbUcWkn6/ufQVS72NaitKivDLis19V6iuuN606HFKMob2WWT+n1OtxTs4SSzX8R3ippzdN2/qRtdrjwfxOjxU1JOK1tllxX8ZnWmK4YJOq9N2WnqZRpq7pyWqt5PgYYV71OzV918OTN2rS7yEZx1tZrrwYR0+Jhvxs17vB8Uzx1aHd1p0pK242j3+MpJVFUfuzVpJLJPj+p4zb1J0tozuklJXVjUStGL8IqK8bq91miJ8rFTzvwLEcdaO9SjJaL5M4oxfvcmdhgcJUxdf7LTtvNNq+lkrmlCLV0ZquSCvNSa8ziqRdKvKPJnLSebWphi3es3bPK/wLUbWESU1NK63ZJ28jklOKw6gnz/AFNfCTfdtLk7kqN2jFZN3uSka9SSeS0uYItS287aEIobeE3q2Dr0Fm4JVoryyl+Tv6GozY2XXWHx1KrPOnfdmucXlL8mwNrY+eJSfFNfkfbPYjtOli6+wdlyhJVcDWqeJrwyi3KS9U2z4pg4Sw21HRnbepz3X5p2Pqnskq/5dtrC4nTu8XFvybs/mXL4uHVcvtP2J/kntA2rW2dVcKE8fKUZU3Z06/hm0uT8cZLo+hq9vMJR25sKt2x2PSjGvC3+d4Omv9Co3ZYiK/8AKqP/ANMm1o0e39p88Dsj2w7Qwu2tyOxO0WDw2Jq1e6cpYWcY7irQ/ui4O64xlJcj5tt3aGK7L7bk8BtDB4qrFP8Aq4erGrQxNKSu72ylCSecX6pMkyz4rufK+3hjw+X43rldZYvBYiUqeFjT+/V/q1Oi+6vr6o+zew7BVq2xaOFwsN/E43E91TXW1vhxPmHazCYbERW3dl05U8JiJ7leg/8A+LV13V/Y9Yvllqs/0N/hQ2XUq7OltRxTjh6EoUr8KlVtX9IqXxOueXtjt8XHC4Z6r9H+zjY1PY/ZyjhaU+8UW7Tatvu+cvVn5w7a7Te0u2+29pykpQ+1zjSb5J7sfyR+pNoYmlsbstisb7scHhJ1F/0xbXyPyDTUZuKqXetWq+f8+pyxdGd401Ti45pd5P6L+cznpxkqKlutuazvxu/2OBOVRNzjaVWVtOH8+RswqRcI/hzlboskaRlJyjObjfKKpw8+fzPCe0vC7K2Xt7A7YwmKccZWcftGHUbxk7PxprR5K/PU95BqnS72bW5TW+78W9PofCO2G1JbR7VVZxqOVKnNxjfTXUM53Udj2z2usVQu21eN18D0/s0wdWPZfC03RcpVZSrKNsryeTfN2Ssj5ftapKvUp0o3k21FeZ+guyuHeF2XTnGlGm91QpJrNJJK5Ux7u2wtmzxWJp0XJTp0luuco5X+9J9P2NjEQp1a8KVGEYqPhg2soxWrfzOWvWqYai6EJJ1Jv+rLkuEf1NTEQrUaTjm61X33xUfw+fFma6tbaddVK0KdJOUIvcgktf3ZqY7EUKFBYaEk9yV5y5z4+i0Xqc7w1enSddQbnUuqaad1zl9F+x1i2dXTdStF93DOz0k+C/nC5Ea+KrvD4d2/1a+rT92HBeb18vM66LlCnKvKS3p3jBL839DcrYRTrSeIrJZ79R30/nA6rHYiGIr7lJ7qjkv7Yr+fEmxxTXdw7yLs5XjBfNmDluxVKKvOo/y4fEyj/Wqb8sqdNZJ8uC82ZYbe8eJqR18NNcnxfojNRyOKUo5pqkreb/5+RyRUGoxlf8c8+H8+ZFCS3Y6r352/n8ucmDpybUZxvKrLiuF/1+QWOk7bKa7M4qbdt9xbXTeR81jql1PqPtEa/wAixSUfCowStw8S/wCT5fFPeiajnl9bVS6efA42rNo2K0d2mpNXUkcF07G4wxIZaOzMQfQvAgAuXIgVuAfQA/IAAAABHl1LmQoUAARALoBWugQplQAgAoIAKAAQAAC4AAXAAAhQAIUAAACFxoAAuAAFwAFxcAACFAAAALgABfIABcXAAC5CgACACgIAOAAAXGgABsEAoIAKAAIUhQAAABscQAFwQCoXAAAEAoAAAAAAAAuAAuLgAACACkKAAAAAABfmAAuwABCkKgIUAAZU/eMTKn7wg5uAeXmQuuZpkvnoVvmQAVaWF3bgCBVXmQAAAUCFTSQ9AlwyAjb4FpVKlGrCrTbU4SUo24NZoWuZQsuFgPoHb+lTr7Jwm18MvFTmpu3BSSa+aPUbA2isZsnDYveV91J+Z5PZeLqbU7KwwFXcnCdCeHh+JVKfij8YtL0Hszxjq4WvgZSalTe9FD63Pr1u1bKpJxtGL8UbcE8zzmP3lie9ispPeUfmerxdPfwm9+CNr9H+/wAzzuMp3hOLecM/Tj9CLlGvhaUIV5Rl7j1fJPR/U39xUt5TVmvC7Z+v1NbDRU6Sb1hZPy4GeKxKdJq/iit3zXD4aBJGvirNzpO290/Ev1PKdqKe/KNRLOKTfkekW9Wi6l3ll8NDp9pxTxMlJeCS0fJiM15Mzjpczq0u7qSg9Yuxi0+BpmvR9jtnzxTxeNjUce4pOKVvebT+h0eLo91jalNpxV3qex9nu7DYmPqTVl3is78FHM8ntSbq7QrT3bZOT9f+TP61rpoUZXm0+JhiHvVJS5syqx7uUXfWNzCjTlVqxhHV/kLUbGBhN05tfeaX6nFiJ2qtR4ZHZ1lSwuGuk1uxtFcW+Z0zd3dgWdt7IxHEEBlirysIq+b0WpafvNhXZzfeYrDYpL/Wpx3v90fC/lf1PpXY2acXJPxb8Zfmj5tsaHf4adN591UU15PJ/Q9z2PnOFScb5Ld+KZb8Mfr6B/isw8qW0ux20rZVdn1aEnzcKikv/mfGtq0qW5Tpd3TVSS7ypJRs1yR99/xUUoy7Fdj8VP8A8LHVKUnyUqaf/wBD597PcFs7Z2Hl2/7R0KeJi6slsPZtRZYuvF276a/8im9fxS8K0Z6MOTHHj/s3jxZ8nLMcP157tDsCXZXYUMPtFzjtXadGNWWFk/8A8fDvODmuFSVk0vupLmfqP/CvhaWH9n7ikr70J3evuqx+aKmz9tdtNv4uvUxDr4mq54rHYyu7QpQ+9Vm+EVol5JH6M/w6Y3DUtk1sJg8V9pw6ox7qra2+l96x48crl29/mcGPDZjvt9R9s+0fsPswxqjK08XuYePXekr/AJJn5slCTpqEVvSqv1stF6/Q+yf4jNoS/wAq2FsaEs61SVaS4Wiklf8A9T+B8djVvKdbRJblO/DKy/LM6R4kyc5OKuoR3IZav+XOaGfgyW81BeS1OOKdKMVb3PE+snoZxioyu2lGC3b62b1+pR03tC23R2N2YrJSfe4hONNdeD9EfB6E3LEynJ3bTd+p6j2p7ce0tvOhCo5UsMty3C/F/I852e2fiNrbVpbPwkXKpVdm0vdjxb8kWOOd3XsPZTsWW0trz2pWpRlQw91T3tN7n6L830Pt2GUKUFXqSiox8NKDer5+SOr7P7Cw2y8Fh9m4SMacKME6kmuPFv69TZxUJYzEKMLQhFWV9IRWrJa64Y6jYWNwGGpfaalqj3rQVr78+LfRHXVNsKq6lRYe9Om96bkrOXJLqzDGKFWrGnRh/ZTjxt+rODHd3SjGhBru6TvN/inxf0MtNHF7a2/i63ghRoueUVbKEfolY6fae0No1XGEcU9yLsnazm+L9TuMfV+z4Zxy7yuryt92HBeuvkdHKShTliJWX3aa5Pn6fMmkrrcb3qj3Mq85Sv8A1JN6vl5IncRoxVNN78nep05ItNK7rSi3GDtG/wB6XIyw6knKtK7aeV+MhUjmUbOGHhdtu8rcXy9DnnClKrGmv9Oks+v/ACzXp/0qcq7l4ndQfXixSclGNGN96bvJ8kZakc0ppQtKylVfwj/PkZ0K8JSdVJ7q8ELfMwjhvtG/Vs3H3IZfzh8zYr4eFPD9you8Foub/YEeY7b1niNlVsPR0lOPrnp+R8+S8cU+h9M23hd/C9zRSeTmnyna6PnOOnSqY2rUoq0ZPe3eV9TU+OWX1u1qblhFbhqde8mdvh6inQpzdmmt1rqaGLo7km1knmMb+GU/WvfmQaA2yAgApAAKQZD4gHoFmh5BIIoAAMxvct76CwVAABwIEKZUBCgAABCgAACAUAAAQoEKABCgIAAAAAAhSFAhQAAAAAAAAOIAAAACACgAAABCgAAAAuAQCgACFIABQAAAAAaAALgAACAUAACFAAAAABkAAAAAAQoAAAgFIUAQoAEKCACkAApCgAQACgIAtQC6AR6lp++iFp+8Bzcip2diFWhpAcLAAAV+gAJ8QQoE9QUBDzD5AgVU7Ijbt1HoXyA9P2BhLH1amzoVu7xNOpHF0HL3ZbuU4881Z/8ASzdwElsL2iOG5u0K87qPSWdvjdHUdgJ049qsJCo2lWVSjda3nCUV+bRvduoYlUdmbWml3sG6NSUXdOUHdO/VO4jUfTsZVp05ygmt2azvoovT4ZP0POY17lduSd77s1f0Zv4Wu8dsbC114oumk+fNGvtODlTU3bNJOy4rL9GSul+OvjKWHqSjN5Pwyd/z+TNNzdSu6el00/M2cVL+krtX0fp+xw4eG/iI1E7t2fqHO12ezqCnh5wS99ZX58DzGPjvY2UG7HtXCNHDqpFpKcW1bg+K/nBnitqSctrzlBWi7NdCxK6LbNLdqQqpZSVn5o67e55Hf7bw/wDRlu5/fidfsDZNTae0FTbtSprfqPouCKkel7PVKGF7HVe9k497VlUlLlBK35nlFV+0VMTiJRSVaSiklouS/I7btHiljMX/AJXg3uYSj/qyjokuH84nSYys4RVOHggluxjxS69TLVauImpVHbRZI58NLuUrL+pLVvguRwwioRVSa6pCnJupvyztmxGXPtCp3tdQi77ur5s1p23rLRZHLSvJyqSV+LZwvX1KItQld5FSsjKkspSfkjIk8kookeXM5HB7u+1rlFGDVvPQDt+yu7HG3qe41aXlxPY7A/p4rEJ6q3zR5Ts3QcoOdtLpnpNk1t2m8TVqKEe68cnw3XZv8rm9dJPr7H/imq4at7PdgbOk6kq9PERx1dU9adDddPefLelPdXO0uTPjWzKm1+0m2sDhMNQqYmvV7vC4XC0slGCyhSiuCSzb82822fUPbhGrh/YthtrYx2x/aPalCvJS1pYanSn3FFdIxab/ALpyZ8y7P7Yn2W7PVfsc5Q27tihKlGqtcJg5ZSkv76mavqop/iOf8dzvrH0/F8iePvO/XpPaJtnZ+ythy7B9nMRHEU6NXf21tKCt9uxC0pRevc080ubu/P2f+Gnajo4GnDeyhRnB/wDTJ/Q+HxjGNJQiskj6R7AcRKnisRRvZJ1l8adz2cvFMOOSPn3my5eS5Zfr7D/iB2g6vbenQjPLC4GFNLlKbbf5M8NQiouEN1NU1vT6vl8kdt7TMYsd7QNo15vejTcV/wCmEVb43Orwqi1GMr+J78/L+fQ87o5fFZTdm777T58P51Or7VbRp7J7OYrEVnaSg2s823bLz4fE7eKlNJSju57z5JaJHyz2y7Sr4vG4Xs/hFKtO6qzhTi3Jt+6rLV6siW6fNMZVlVxE6tR3lNuTfNs+y+xfs49nbN/zrE019pxiXdX1hT4P11+B0PY/2T7V2hOji9s1aOBw8bVKlGd5VHBcHbJX01ufZ9m4XD0akaNOtB7i8PhtCNuPktBaxjilb/u9F00251HepLpyNPFzWGoqlFWnU8VV8VHVR+vwOe2/irzxWHqq7l77SnLgs1odZjMPiqmMlSr2ee/VlCafmtdTLq441nRhLES/1Kl401+FaOX0XqaFKpBynWqL+jSd1F/flwj/ADgce0Xjqso2wdeClLdprceSWi9DqNp4t092hGMt2ndJtNb0uL/QJa58ROWMxUt+drycqkuCXFnXY6qsTXUKULRXgpp8F/M2cWJxVSlT7lRe/JqVRpaLgjVn9qjTtToVXVrK+SeUH+vyDNrnxFSEpU6NJZQ8MH+J8X/OBwvEKrVjCnJKMMr8OsjZwvZzblSnGf2d05V24x3smo8XY7Sn2Qp4PC03i8XFVKsm2rpWiv1fyIu3TOr9pqeCLlSprhy4fFnY7N2ZXqwlia0Jw33uxfDr+Vl6nbd/2d2TgbQqUpVJT8T6JZHTbT7XwrQhQwGGta9nprqyK7SsqGCwlJTaiouUrX16HR1cb9rxChCVrye81wR1dd47HzlVq1XZWSS4s3qND7HhE5W36idui4sJtw7Vrulhq9a/uq8bLR3sfPMbhpYXHNP3Z+ODejvw+h76uo1qM4zjeM9b8F/yeR7VxdN0qUpXcG7Pnp+xWL9aGGkrSjHKM3e34Wc83LOFRJtL4nXUqrjJSXHXqdleVfDqUPE1quJL9WdzTSq01vPdyfJnC1Z2ubc0nna5wyhC/v7r4qSOku3NxehDOcWuTXNO5iFQFzAB5ksUAQrIxncIt0TiQBVBMyoBaQC8wBrghTKiAAAcAAAAAAAAAEAAABAAAAAAAAAAAAEAACAAAAgArAAAgAAAhQEAACAC+QAAAAAAAACAAACF4AAEAAAAAAAAAQAUAAAAAAyAAAAOAABAAAAAAAAAIIAgwNQAAAAhQIUACFCHoABX5WGgEBSALgAAZU/eRjcyp++gOVFXIlhZpo0jLzJmVETzyAuoIi3TCCyyCLcnwALMOwef/I01AegDZGFUmd0EZJaNXAtGtVw1enXotxnTkpwfJp3R9L2ts3D7R7PbRo0N6MqtKntPDU920YxazUXxto/Q+apXu2fV8H3lBbExc5KVCeFo0t2SulCpFQlbl4lF+oWVxezrERxHZuOHSvOKa9Vp+R2OISdOdPmt5Zctfy+R5XsnUnsbtNtDZEtKdZuC6Xy/Kx7HaMHSnKrTVldSiujz/YVuXp5XGVLKpFZN5mxsKCqweWcfEvLicG1KUaWLe61KOTVuTO02DSlQkpxUXu8ODX7ojE+uwqyisBVpK3ijvR6NfqvoeJtGeMc5e7LJnru0CVBuEZJxlFOD6PT9PieTwKc9+LWcJP4BcvrYr0N/DypSSbirr6o6CONezMDWw+Fs8ZiW4uX/AJcFx82esVOdSle2cErrmv2PD9pYLDY+rSgrOficuafAtvTLXliYYfDOhStKTd5Sa1f6GrSpzrSdSWnFviXBYaWIqWSe6s5M7PEqjQj3U5Wmnbu45tLqQdZiE1Zt+RwK7e6uJniKjqVG9EskjBO2d8xsbOUMLJ6OTt6I1lmzKUm4qN9C0s5K+izY3sR5ROSjBTcYXtHWTvojGpoiXe6orjr1KOerKM3KrFbsILdgjgpRc6ltTmxFqdGFJe8/FIuApynWhuq73hrtL8er7J4WUqUqMY3dSPh81p+hvbBowxG1MNsutnRr42MKnN0205L8ja2Jh+4SlFZxSkn01Jh4wpdt6M6NlShWUlZaOSvb0yRokfRf8W+Npqj2U2I7RhThUrzS0SSjH6SPg2GxEsTjamJnZOb0WkVokuiVkfUP8UuP+0dvadHeusJsqnBLgpVJSb/9rPkuz3aazsdeD6vNetO/j7mR7r2Dy/8A37HU3KyilJ/9UZRPE7Jw2K2jjsPs/AUKmIxWJqRpUKUM5Tm3ZJH0jYNPZHZ3bWJ2Hs2dPFYrD4V/b9oRb3a1feScKfB04XaT4vefI6+RlJNJw8eWX9p8j0W1a0cbtbE4pZfaa8pX/tv/AD4HFQlv1Ulbdk7+UUSW8otWzUVBeb1GElF1JSbtHT/pR5HVzbe2lQ2TsavtDFO3dx37Xs3pZfT/AIOt9m+xKmE2fiO0e1YJ7X2u9+8l4qFJ+7Bcrq1/RcDrttKfaPtPhtn+/g8LNVsSrZTktIvp+59CobtJKtNXa8FNW+9xfkr/ABsSk7rV2k6tGh3FOcd5O9R2+9wXkvmdZjaWLo0Y0XVaqVPFVfJcI/VnfQdKnS+0TSlabVJPPel1XJGiqcMTOpOtJ7sXvVJc+nmzLpp0MoYvDUO/7x97PKimvdWjn9F68kddKGJUJV8TXnKEXmlrOX4f1Z6PEp4nE7kIpSbsuUUvokdftJUZyioW7un4Yu1t58Zev6AeXxGJ2vXrJQqOL0ik2owS+SRp1NtbVouMKM5ThGV3Unm5PpfRdD0W0Iww9J4eC/qVP9WX4Vwj+vodTNQpU3W3bXdqSfP8Xp8wzdtGt2m2tQqNzVKpW1acE1Dq78fl5nHU7WbbjWjWqVY73vbqgm5efJEWHpxhOvUjeMXlf78uRq0qEZTnUq5pZydtXwQZrk2h2p29ipRnicZUi2soQydr/kjrsbidoYqUZ1q05TaVk23lwvc26WH35yq1bNJ3a58kc1KCgpV5pXbtG/Pn6foQ7dZRwEqtT+rU3rLenJu/mkblCnGEruPinkstEbNapToUVCXvSs5Ja24L6nJs7Dyq13XqxSUFdReiS4E+mtNunThFQo3jGzvKT4c36GF3j8VKUMqVOOSXJZJev1OPH1ZX7ikt6dV2y5fucGKx9DAUVbNQfia1lJ5P05BLXBjK0adBTk0k1uux4ntHVq1MXB1Pc3FuHfOc8S5uq7JeJRudV2pjGMKFlo3Z9MjU6ZrpIPdlmrxfA2sPWdCpr4ZGra6LB3W5fJ/kxYkunZTnCcVLTmzWqrea/I4aVZ05bss1oZuUXpdDHpcu2DydiX5mbaazMckzbO0Bbky5EAC4uAAQAj0KAFSwsGUAAANYEKZUBCgAABCgAAOAADgAAFwACFwAAuAABCgEAACFwOAAMAAAAAAAAAAAAA+IHEAW7IAAAAAAACFAIAAAAAFwAAbAAAAACFAAAAhcAAAAAuAAAAAAAQoABAAALgAAwAAYABAAAAAAAADPhcBMC3J8RfMALsPTUgAuVhwIUAZUvfRjfLqZU/fQHM+gXVC7Cu9TTK5keXAyIAWmgzsBwAZgl8y3CpcPLMXKAAYCHxLF52IXyAyTtqfZey+Hw+2vZ/s+FWUoTpQjDfj70VCen/tR8Yz5n032O7Sc9k7T2VJ+Oku9hnrF6/Br8w1j9aPauk8L7QcLi5ZLFLdb6r+I9djZSqbOjUSyjl5p5r6/E6T2jYSdTZlLH0Yb1bCTjXT424r+cjtqEvtOzYyhdwq0lu55XeaK1Jp5vEzeInBRV92W6304Hq9l4W2DhPLwpKWXDg/p8DzuxsG54uTn952V+D4P4nstnuEIRjUdoyjuTb4X4+mvoQxm+3RdrH/3LdWTpO6fR/v8zy+AXd4vvIpNSd7cOqO/7RVrVZQqPNXhI6vZlJy8D11j58gmX12lKMKaU00081fiuX0Pn/b+MVttOn7kqacembyPpOFpKeHdGTtfODb0fLyf6Hzbt7eO1oQlFpxg1nrqSxco6mlipU8NGjh1abd5T4+hadGSvVqyfPPVnFhqkYaR8XFvgugr15VZtt6lc3A/eeXEXK8paWItTKlzKL1RgVMsHJPNXfMywsd/Ewjfj8EYrOlLmmhh5bs5PnFooyrtTqNri8vI7Ls9T3sRnayzOtp514vroes7OYBRxMXOySe7L5GtM369fsyjGWEjK1lDKXk/4zo9kTc8fhcRPKFTHyfo0rfQ7xVHhcBiY2vKVNw9TpcRFYWthqNvdxjjfySX0ZGmv7esesX7R9rJZ2nRhfpClFW+LZ4rCy3WuB2PbvFvG9r9pV273rtX8svoZ9j8HhsRtCeLx6bwOCj39eP/AJln4afnJ2Xlc6ceXrNlxud1Hu9hyj2S7LrG/wD+Q7aouFBr3sDg5ZOouVSrmk+ELv7yNjsHsvFOrPa86E1gXL7KqraV5q0t1LjZJN8rrmdHsHD47tn2sffYuGHdabrYrETXgwtGKvKbXCEIrJdEj0K7S4fbfbShhNj0p0NhbMwk8Ps6hLKTjdb1WfOc5eJvyXA4SZcuVzr7PNlx+N404Z9r2Fd3imrttOXq8jCcZ06EYUIOVWp4UvP9/kSk25+JrJpPyR32zMI401UnButVfhSWcU/qbr5ettPs7saGBpyg2pV5ydXEVnz426LgdpJ/bK8aUVuRSsr/AHYLicmKgqMFh6KblKS393Vv8K8vmcVSUMNSdNW3pP8AqzX/AMV0+plqTTg2hvVq8KdBScVaFONs7fzNmnj6vcxjhqc/BB3k196XF/odhFuhFys1VqLn7kX9X8jQqSp0o/aZpZO1JNe9Lm+i+fqRpq4p/ZcO4POrU/1Gnmlwj58/Q6xVlSg8TO0mnu0YPjLn5L52GLquvOUe8e7FuVST4Ln5nU4ivUxFRKnGSd9ylC+iDNrGe/iKslKp4YvfrSf05s1qjq4nFxoxgqe9lBN5QiufzZyYypGKjQpy8EHeb/FLi/LkcOLl3OHcH/q1Veb4xjy83x6WIztwY+pCpOFOgm6UHuw5zfGT8/0NWskpRo0s9152+9L9EYy7yjT397xSVorjGPM1XUlShdPxSyilqlzCbbGIn4o0KUlaOsuF+LNavi7uKisllBfVnDvXl3MNXnOXJcjd2Zg5Sm6843UFezWVuCGk25MDgpTqxdR705O82+BtYzH08JSdOmlKtVd0uEY8LitjKeBoTqTa32moR5y/Q6Gg5Va8sTXblG95N8X+FAvTs4zWHoyxNVtzkm4vilzPN4iGNxVR1FB7mahH5Ge0to46deM8LgqlenGV24JtZaLIyw/abCpyp1sNKlJ52tpI1GK0oSxdpLu5KSVrWz6oz2ns7F4rAQrSg7WvHz5Hdx7RYCo6VaLipvKaa/M5MTjO/wALKNKUVvRbjbS/AbNPnlN204ElZSy0GcajT1vmJrO60YqL7ztx4PmWOTSfIxX58C+87rLoSq5E8r+hb/Axi2156lNxP0efExbzMtCZEAEKFPUEKECFAAAAATMAa4IDLSghQABABQQCoAgFAAEKAAAAAAAAAAFwAAAAEKQAUAAAQCgAAAAAuCAUEAAoAEKQoELcAAgxoAAAAAEAoAAAAAALABcAALgAAABCgAAAAAAAAABcAAQFAAgAFIUCFIUAAAABABSFAALIgAoIAKLBAVcy085IxLT99Ac/DUXJfqONjSKnlmLpBaklrcClMV5IvmADy5l9CZ9ADKQoAAAWzIiPXTUqvawFb6HrPZNWdPtY4cKuEqxa55J/Q8nbqdt2MxccB2p2fiar3YKtuTd9FJOL+ZVn19oxeEpVdn7tSG9CpDdknpa7X6nndixnQ2ZW2dO7lgqjgm+MXnF/B/kepxDl9njG+UU16p3/AFOgxtPu9oOvTit2vSUJ25rNP5oOlcNKMYVp5JRmt5Lk+K+J3c5xqYKFVffXiS4SWv6+p1VKm5KcYtLLeXPqvk/Q3Uu7wdWDdnuqcfTX8n+RCTTynavEOeJjNZOeufFZfozPAQb3ZRbjvJST5fxmrjY9/jZwfDxJ+Wv5fI7rZmHbjGirLLep82+K9V+aRYx9redLdpqbWU1Z/wBsuK+p847d0KuL2rLEQcbRioySXHmfUoxhSws+9/05wzk17skrp/r0bPn2Ni6s61S13Jt5kM68LJOEnF3T0Zy0KtOm793vStqzn2lhakanep70ZPXl0NOUJR96LQYZTtUbk3Z9TjWouvQMlVWld20IWzuSz5EHNQSknDi4s44u0i0XaaYllPLQ0Ow2Phu/xEZW8KeZ77ZtBrcbjk45+ay/Q832Oob+GrSsspRlf1t9T2mDpJU5RWq8V/yf0NMyM9rpSwNOonZznGLy4qS+ljodrOf+X4HGyf8AqVZVHbrOX0sdttit3WGjFfi30+W7Fv6HW7UjGfZqNFLxUYQafor/ADCvnm0Kvf7QxFb8dWUviztpVXhdm0NnRajKUu/rtauTXhT8l+cmdZsulCri1Kqv6VL+pU6pcPV2Xqdx2cjRr7Tr7S2glLC4OLxFaPCo7+Gn/wBUml5X5GMruaejgmsvau52liY7B7MR2LQlbH7UjGvj5r3qeH96nRv/AHZTl/0Lmd52A7N7XwcaO36+HtgsRQe6o+KcY3yk1wTs8zzvYnZmJ7X9rZ4jGt1Ke+8RinbJ55QXK+nknyP0Aq0sG6G5GFPuaWkVa0nn+SOsvpj6xjkt5c7lXV7FwtDErv8AxdzCd837z4R/U9E6iw1N1Wv6k/d/sXP9DGlWjWp0e+pQqTk9+yjbXTTiTEwpQqutKsp1ddyecYy6tcuRytbk01pVKmHV2mq09L/+HF8f9z/JGtRqQi1VnHwp2pxl9582uSOWrhq06Lq13OpSd5ylB3lPy6nQ7UxrlUUVFxqX3Yx0UUuHkgW6dlWrQquaqTdk96pK+aX1b4HSbSxs8TWSjB2uoQpx+6uCXU6/HbVioqjTn4Iu8n+KXPy5fuaccYqUXUcmqlReD+2L1l5vh/wNJcm1jpqnB0Kc/BB3qS/FPl5L9WaHfPD3kv8AVqKy5xi+Pmzi+0Qa3pf6MOH43y/nA6/EYqVas7zSk3dvhFfoGLXYQnThB15pNRdoxf3pfpzOvlV72pOrWm3FS3pf3Pl6mjisa69RRg2owVo34Lmzg7ypiaip0rqEc39WTSXKNjFYl1JyrVLWT04P+1dDWj31WrvSVpTzWWiO12TsHFbRrRcqbjRjdu7tZL6nfbN2LGlU3q+7HPO+kV+xOk7rp8BstUsLTnJJyqZt9L5fU2NpYihs3BQpteOb3nlmlwXzLt3bOHhiJKlFbl7RhHkskjy+MxFbH4lyqPenJ5Ll0H1r4wnUqbQxLqSyS0/tRp7a2h3cY4bDppaX5fuc+Mr06MPs2HactZNcX+hx7PjRjVnSxN50arzfFPhIsjO2jgsXWoKNSnNqUHZ2fDgdrPatLE4enHHYWhiLRcbzgm1668TjxWyp4Wq01enJW3uFnozgp4Z7k4TVpRd9PRl2duT/ACPZeLdL7PiKmGlNXt70UzClsTamEqReGrU8RFp+GMrO3HJnJDD1YVaDi3b9yxr4nDpO8laTJseZ2nGSxtVum6d5X3WrWOBeKOdjutuzeJw9GrNWlFuLlzTzOlhaFTPQtZTPRFfhmkssipZ3TyMWt6YVyQ0bFxZJJFWhfwRvoRlb8iZ2zAqyHUAB5AAAAABCgiAAKNUpCmWgAAAABC8AACAAEKAAFwEAAAABgAGwAAAAhQAAAyAADIAAEAAAAAAAAAAAAAZAAAgAHEAAABCgAQoAAAZAAAAAAAEKAAAEKAAAAAAqAgAAEKAAAAAhQIUBAAAAAAAAAQpCgQuYAAW6gIAMgXJAQAMBxLT94j0LT99Fg5uQV+JLsq5lRc76jPmCgBzAyYEKNEMggHbS4F+AUsrltlmS2d9Rw5AF+QvnqOlysC9LlXmzHlmOGQH27sltf/N+zmDxMmnUhONOsv7lk/jr6meJUn3iut6CuujTPN+yWSfZrGJJ3hit7rpE9ViaT7yq1dRbcfjcsdp3GvhNxYlVUvDrb+1rNfmzm2hHuJeLNxyfVFw8EqFmleDs0lwefzuTbE1VoU53u2tyXmtPysRLXn6GGUMXNyW84vXmjtMDT/7xGEMmmtzy4MwoqPdym2t5Ldll8P50NzYNNVcQqij/AKTtLqm8vz+aDMjm7bTp4HZVfdsu8gnG2ib5HzmDkqLpyatbwy/nA9V7Rce8TOjgE/FBuVlxieZUU8M4N2ai9x/QM5fXU1MPKtRnBe808nx/c6zBZVXDERV45WZ6fZtB16Sa96Kz6rmaM8BTxM8TSTjGpTlvQlp6eRWK0quxaVam6ylGinmmlr5I6evh54WpuVVeD0kjvtnuvOs6NR2dPXeyUTZ2nh6csO409H70ms3+iFhK8pGLhON3dPR80Z4ii6cU8nCWafLoclel9mnuT9xvTiupnCaq4d0HZ2zgyNbaMbqRXqJKz5Fgr3QiPa+z3dqQ7t2tJuL6cP0Z7TD01SrQ31ZJWlf4M+a9htoQwm11h60kqdd2u+EuHx0+B9Wx8ItQqxj4akd7Lno/zG1jxnbnGfZXRovNuUov1yv8LnFtStZVqTeWaXLoXt3ReL2ts6Nrw7uTqLnu/qka+3qveYmmqUXJ1IwtFK7bsloaR5ObVDDKjF+Oo9+o+S+6vr6o2cXPucHR2ZST35yVWvZZuTXgh6J/GT5Hrezfsx2rjsTCttbEU9mUZVPDTa36zz4x0j6v0PY4bs72V2NjHXw2EnjKlOe8sVi578pST1UVaK+F+pjHq7rt/wCuo7n2b9mo7A2LQpShfEzXfYpri7e7fpp8eZ6jEdy3u1X3lWcs4Rer5Nnn6u25Rpxw0Zve96o9LPhH049SSxdSGHThLx1U7NLOMOL9dPiW3bUkjtsdtSVJyp0Wt5+GdSOi/tj+p18caqcFWxF3Fu1OF85vn/t5vj8tShSTg511JUYO1r5zfCK68+RpbSlWr1N2EL1p+FKOkEvurkkRbW/V2zia1e0al59MlFL5RRwV+0dPc7hqGJgvfnUhfe6K+kfzf5Lz+NlKlTlQpS8D/wBWovvtcF/b046+Wo06MN+st+TzhSfDrL9Axvbv5y7O4hd5i8A8PfOHdVGnJ87O6sdfV2Ts/GVpPB7ZnGT8TVelourXD0OiryxFapKc57qWcpy4fzgjSr46f+jQUlBvTjJ83+g2zZHe4vYOLm1GhtLZ7hH3V31vV3WrMF2S2lUoJrF4OMGlKVR1l4vLoeeni503/wCZNPT7sX15nFWxeJk97EVarvmop5/sN1PWPV4Xsjh4xjCttTDylJb1Tcney5HYU6fZ3ZdPuYYiNabd5OOd7aJdDwU8Zie63HN0qbzsn4peZwXqtL3oxeiv4mS2nrjHvtpdrcJg8I6GChByk/E1wS0Xx4Hlcb2h2hilJd447ytZLJI6t0pKScrOWu7wiuopxzcna175/ef6EW3TKLlnOcm5vS+tuZK1Z4em4U1erJeJr7q5HDiMS6crR8dR5pW06nJsulGOJnGvPeVTWT4p6M1py3tyYbDRrUd9e9HKXXkzKtg6jo3jrDL04HK4VMHiXZNx0a5o3aNeEpbs1orN80TbUa2ztpunRjRxUd+Ce478FwfzOxxGCoVaccVQzjPKWejNWvgIznJRtaorXvx4M49lTrYetLDyfhnlZ8HwF7VzUl/SUZLxQl/PkZYmnRlKpCSSW8pL+epKtOUnKUfvK/kzCqptxbzcoW+H/BFef7QYdUKUknem5pxueelnNnsO0mF+07IVWnffpf1PNcV9TyEI3uyz4zpaeaklqWnHw73FmEdWkbapNQv+F2aEHDPXLgFe1xJZi5oY68SjiAJ5FAQQAAAAAAAAAAGsgAZaAAAAAEKAAAABAAALgABdgALi4AAAKwAAcQCFwACLwIAAAAAAAAAAAAAAAW5ABSXAAIAAAABCgAAAgBbsgQDMZhgALgAAAAAAAAAAAgKhcmYAXFxoAAAAAAAAEARSACk4AAAAAAAEKQoAAAEVEAFz4BXGZALeRL5ZhX5kAq4gIAEZU/fRjwLT99CDmS5FjpkQquaRS8CegenAIALS+QzAt2HyRCXuFW7tqBe5H+YQ4DgExbIKLSyMvmQL0QF8rCQ6cSq7X7kR9I9is6UsDtihNXlHcqJc7pr5pHupUnBVIz8M3G7TWjyf6nyz2RbRp4DtlRp10nRxUHSabteXvR/NW9T65i7ynUxU7KLqO6bzlfX8iu2PcdZBWm1b/VW79V+Zpxkp1ZUuEo70fNftc28VF6p+KN0vNM0sZvUcSsRBrNKcVwz1Xxugaau9J15Uo2tWW768Pz+Z3fZmKw8O8qaTT3r+R1NTD72K307xaUoZcGbfaDGLZ+BjJO29Tc1bqv1uD528Ft3FzxXaKtUTk4xlaDT5GxVt3caiikmndLgzqNnOVatLeaSlLeTfB/odpi13VLdl4b5NPmK5NrZFO0VUjknmrcHyOPD0sNDG4mvVlOMXPd3IRUszsezFOPczp1Goxl95/da4nSYjEUovHKpvb0K1rprUIw29hYxnDF4felB2jJJW+JyYarFYdxUVOq1rqofqzssHThj9kVqcasHeGjyloefwElRm4V7qza3U87/QrN6ef2tQnTxE5NOzevU0qU5Qnkeg7RQdSmppJJaJaHnWmmKuLmrNSk7Zb2a6Mwhe+XFGUlvUm190wpvMilRNO6yZ9S7C7fW1NiSweKd8Xg3vNt+/TeV/PS/xPlspeLPRqxsbJx1bZuPhiaLd4u0l+KL1RSPfbYp18Z2loYPCU6lSpWpOlGMc9ePl14H0bs92XwWw0q1VRxOPcEpVeEMtIcl11f5E9nezqNTZ0dr9ylicRT/p1paqlwV+uvXI9LUp0YXlu967eUb/ADZLXTDD9rrXQrrDzq739SsnGmre7H70vXT4mjHYVSUe8qPj4E3k3z8jv1DcarYhqU3nCD/JvkuhzwpqrHvsTvNy92KybX0j/EZ266eYpbDoUYyrYiUnGMvE085PkupxzhVliYxhGKqVM+UacUvkkd/iqc61SO6lOUV4Yp2jBc+i6nXYmlGMpUqPic/9Wr+Lov7fmVNOuxNdznHcbVKn4aa+cn1f7cCYmm8LRdNJ99UX9WX4I/h8+fw5m7GCwdq092U3nSi+H976cjTVPv3UlUqSjSg96pN6/wDL4EV09aLpQeIlFbqe7Ti+Mub6I6yMKlapLfqaNynJ8FzO12lVeIrRSp2z3acLrJHXYqtG6o05WhF3k/xPn5cg5tDHb1acadKMlTTtGKWbfN9WaeJpQop0oWc3lUmuHRHb1Y/ZoO1+/nr/AGJ//Z/kaKpRpw76qsr/ANNP7z5+QHXTpKhHRd484rkufmccafdLvamc5e4mvzNlRU5Sq13J007t/ifJHFKaqzlVqLwrJLg+SXQiNeVNQTq1LOcs4p/Mkb0/HJqVSWifDqZTq+J1alrv3V/OBrSm6s3OTvd3S/F+wZt0Tak9cr3bf3v2NavWmrqC3mumSLVq71Tdi8r+KS4HJgqXd1XGot7hLqixi3biw1Pep70leUXdvmmblJpRjJL3OH9r/R/MzeGdKppdW+KYjSdKvZ5pKz6p/sW1ZNN5TVWnaebgkm+ceD+hlUop0lOOsNeq4M4qVN05Wbuo5PrF/sclGpKjWlTnnBeF9UZac1Ct/TSqNeHJ/Q5MVTjV3atPKXF9TCEIqcoTWUsm78Of1MKKqQnOg/To0TStmacHNqN1ON0uTOGMqNSEJJ+KMrtckbWGqudDR3pu68nqa+JwjjJuirbyun+YWuDEUFPC4mjFZ7skvgz5/Rjd2fqfQcLOUqsXNe9G7Xl/weN2lh/smPxVC2k3u+TzRpmusiv6nS52GEqQalGqm01bU0Uv6tlpHI5FkXTK1ouM2uTMOPkckm5JXbeRi78CiLnYj1KrrMZ+gVLK1yWLpzLYDEF4XuNNEBAXmSzAAqRLBACzAGqADLQXgCACggFAAAAAAwACBCgAAAAAAAIAAAAAAAgAoIUAAQCi4ABAAALgAACAUXAAAAAAEAAAAAIALggFAAAAAAAAAAAAAAAAAAAEKBCgABwAAC4AAAAAQoAAgFBCgAAAAIBQQpdAALAAAQBkBnwAGVL30YmVL39QOYvDXIlyrpkaZA+gzsThmFFpYAceADXMnmXgM+NgF7WGqDQSAcivQMPQIPoX1I9NSt5BQXyI2tQm1kgMqVWdKpCpSk41ISUoSXBrNH3PY22qe3uzmGxtOEYu25Ugvuz+8v06WPhL9D2nsl23/lu3PsNZKVHEPfp3elWOnxWXwDeF1X0fFb0a84NxbhNJ2XHRmtUp79Dcm/8ATlf0f7/M2qa7ydZzTcmn4r6u97nDK0q9lZKorZ9dPzsV0tc+EpKeGj4bqnKz/wBrzX53+J5z2iYlTwtClTy3Lwt63+p6fAycXOOXjhbPnqvzR4PtPKWIx06Kd7u69CfrGd1GpsfBJpTSVpL4PiibdqNzpwXFqMnfijt9lxWE2ZU71qKmrp20fB/T1Oq2dQe0toOLdoVHbef3XwZXN3uxqco7Bq13lOlBuXWPP00+B4OVeMsBUlNPeq123JPNo9z2sc9mdmK0Yb0a0Y920uuTR89qSe5h8JJXdOPivqm3diFel7M1IKG46zj/ALomttXDOjtPejKG5PNzUskybLp0qcVac45cVc4tuSjOC3atN2zum0/zH6zZ0x2m4VME1Dgs5PV/ojyd/H6noMVisPS2VOO+51prdiuXU89xzFJHNG6TSzTTRxr3kc1OE2qcYxcpSfhilm23ayPpfYv2QbTx0IY3tFOWzsM1dYdf68l/dwgvO76Ea1v4+Z4XC4nG4iOHwmHq4itJ+GnTg5Sfoj6X2T9k+JnKliu1FR4WErSjgqUk6s/970gvi/I+vbL2Fsrstgu52XgqFCtOKs4xu11m3nKXJPQ0MRGcXKviKs1G/id/FN8l1+QdMcP9u3wFGhHDRg1ChhqSUIxgslZZRiuLsc1XE0N+FOjSu72inm/PzPI1No4itWhFRlvX3adOGiXJfqWti6lOLp0p3byq1U9f7Y9OvHyJp029HOvh4VX/AONU+89Yp/V/l5k+0Qqqc3U3YxdpVJfJc30+h5enUfdOpWnOFCLyt71R/hj9XovnqYnadStOMc1uvdp0oO6j5c314k0bepxO0aXd91CLjTvmvvTfNv6GMp0qM06kYurbKlwj/u//AKnlXtCWFn4G5Yi+ctVS8ucuvDz048PialVym6sqdGDvOpLPPkucmE29NOEMXVqOdVK3iqVZe7BfzRHTbV2hh5KOHw940KbyTycn+J9fkdRtTalSrGNODdLDwd4wTzb5y5yOvrYqpQalO0qz91fg6vr0KlrexteNFOKu6s8pZ+6uXm+P/Jp0Jxg+/mlr/TjbV8/JfM69VG06tbe3d7n7z5HHPETrTlKclFLV8IrkibZb0pQqSlKbluqV5Svm3y8zrsbiJ18Q/EoxWttILkjXr4qdVqNN7tOOnRc31NZvvcoytCOcnzCWuTEVXWerhRp5L+c2atWtdq6yWUI8xVqXsknZe7H6s1alWEG5ynaXP6IaYtclV5OVR70+K4LoaFbFOdTcptqLycv0OLFVp1rWW7TenN+ZyQpqrTckrSWvTr5GpNM3ttUYpJTtqs/M7Gjuygp8Y5Py4M6vCytenPK+T6cmblGbpVLT4eGSJYsdxQcK9HdfvQV11RlUoKpTvHWCv5x/Y6+lUnRrJxabjmnzOzo1HGanBppq6T4rl80Za0win3Kk1/p2Uv8Abz9C4ulv01VSvKmrStxXBm46MadTejacJcH96L4fQUYuhOVOdpxtbP70H9fqgunVKtK0W3kvC18jeclOEKsPe0fnwZjXw0adedKaVpZb3Do/kcGG31N0b23lZdJLQDdjFU62+v8ATnm156/A26kJSoKK96DsauFtVw7jPWOav+ZuUW5+BrOS3b9eBK1K6/uHTr2a8Klk+kjzPbekqe0qdbdsp09ebTt+h7aVN1KfhzdrP0zR53tzhe82dSxSVpQnZvpJfqixmx4vDRUoybupXzJLI5LqGUUsitwm9LSt6G3NxSySJqjOa4Xt5nHbhctWCad7lvyd0jG1uKMl1siKXyzC4jjwsOmQEdnxBdSPPVgLAJZZFt8QJmCtABkBYBGmAUy0AhQIUAAAAAAAhSFAAACFAAAAAAAAAAAAAAAAAAhQAAAAABAQoAEKABCgAQvAAAAAAAAAACFIABQAAAAAAAAAIUACFAAEKAAAQAMAAAAAAAAEAoAKAAAAACFAIAAQEKQqKIUZAAtQyFVwLYXyIAHAype8Yt8C0/fQHMVX9DFsLUqMs7/IO5j1zMo3tqAsw0y+pi7XvcC55lItc7gC5AnHQqduADhkRW5lbI8nmwLfkL88zHgW/AAM/wDkjsL9WBlnbiZUp1KdWFWm3GcGpRa4NZpmK6sqQV96wdVTwdKpZJTpQqSa0zV/qcdel4XNNZXSs/U6fsNtKltHstTot3r0YqjPPTdXhfqrfA36qq0KjpObcd3KXoXbrtyY2u6dN1IuzdppfP8AO6PEYl1KvaBv7t1KPzR6quu8wEryzg3ey4PP53+J0aVGEqlSVlUpLTmn+/zMs59uPtPjacaUaFLJSSsuT5HadkMHCjCGJqpbtSLklrZ8V/OZ5Tu5Y/aN83uO8eq5HoJ7WWz8D9nTTptXuuEraornJ3twe0HbEKuIhRUL7rTz0dtL/keUw1JYiv3lRKTk7ty/UzqV61fEyrVE/G/NNGxGth8NG8qcd5/he6ypWeMq0MNR8MpJ201X6nncXjXWnZLLg2ZbTxUsTWdk1G+V3c1YU1brzLpGEpLV5nY9mOz21+0u0PsmysK6slnUqPKFNc5Ph83wueo9n3s42h2mlHHY5zwOyVm6zXiqrlBPh/dp56H3HY2yNnbKwMMBsvDxweDp8YLx1HxzesurM3t1xw26f2fdh9kdmYRxNTcxe0Yq08XOOVN/hpR4PrrxbSyPWyxUlJVkoqKlanHW8lxfO3E0+6niJRlvdzh6TsmuHRc5P/kSj3776o5QoU/DFcl+Fc2/3DrMdfGxek4qpiJSk5vesvel16LXM6rasJ42pBQpf2whHguS/U3qMXXcqjcacVk5P3Yrgv2JiZU1RlSobyjJWnN+9Lp0XQmzTzVfD0sNvUqT36k8qlRaJfhi/m/prxUMLGUO9xG/GhF2ik85vkvq+B2s8HTilUrp7iV4U07Sn+kevw5nFOhVxdWKULyatGMclGPJckVl0WO+0YvEJRjl7kYQWUV+FI066WDvSw7cq7ynNaQ5qPXqeixShh4yw+Ee/UkrVKy0iuKj+poUNmUtzvKu9Cgnk171R8l+o0Olw+ElOm51HKFGLtdayf4Y9evAmMqOW5SjTa3XaFOOdv1b5naYtTqVYxhT8S8MIQ0iuSNetCODTUJ3xDVpT13Oi69SK6upD7O397EfFUv1l8vPTrZRvKU5yahF5t6t8l1OylCHduVWThTi82nnJ8l1OpxlV16iUI2SyjG+UV/OIYtcdacsRUskoqPXKKNSvLftSpZxTyXPqy16qS7mjdq/if4n+hq1Klr06TTb9+X08iIs5X/pUpeDWUnx6+RxzqJLdTslz+bOGtWjThqkuN+PmdXXx121QzvrJ/Qsm3PLJvYnERheMbyla9uLNOlerUbqtZ6f2/sccE1JVE3nmn1NmKWU4qy4rky/GR0txuMk7cVy6mVNSo1E42fyaNqmlWgl99LL+5cvM5KWHjOG65JfhlyfXoLVjgqQ3kpwyvp+jOVNzpKTXijZS+hY03BuEoyT0knwMlHu6l5rJrxW4rmRpyU3v0lk7w+RtYWq9x0+Xij9V/ORwQgoTT1Wj6o5FCVKtk7uLy6ksXbtcJinUody7XXijf8ANGxTk60PDaVSl4o85R4r6nVKEqdTehLlKD6HY0Z7laFWDtvZro+KIu3YVKEcThY1IZqKV8+D0ZpYvC+7VgtdXbRo7LASVCtJJb0KmaXn7yNmpRjGUqcnenU918uTM7b1K8+m6FZVVpLNr5o3MLK1Z029dH8jOrhm4TpONpwd15rVGvCEk4TWco5Nr8mVj42qrlSnOpBWUlvrzTzNTb1COP2Hiacc6ii2kua8S+R2GHtXhuSsn7yXPmjhq4evhm91b0JRV/T9h8asfKWryskSpHcyevJHbdqdm/5bj96OWHr3nS6c4+h07d2dfrlpmpXVpK64PijjfQq1DXUisUrp8S6JFsyaLqAzQJxLxyAEMmR9AgOiCzKFNSWKNQHqAANMEBlQpABQQACkAFAAEKAAAAAAAAAAAABAAAAEAAAADMAAAABABQQoEKAAAAC2YAAC4AAAAAABCgAEAgAHoMwAD0AAC4AAAAAAAQAAWHApAAAAAAAAAIUBAEAAHoCsgAAACMoAAEKKAETYBeQL6ASwXqLcgAWmgz1Q4ahDYLoM1xKyN3AFh7yJ5lh7xRyZDrwIXiVFQu7k0Lm9AGa4BXHDMXz6XCF35Fv1JfPoR2AyTa1FzHMtwqi99TF9AgMuPAcXmQdQLYW8yXV9C+oFzLFsxvwsVXuEdz2V2zU2NtSOI3XOjNblaF9Y811XA+r0cZQ2jhoVaFWM4Nf05rjy/Q+IOVkd/wBhMJ2o2rtdYHszQrV6t1KpFf6cV+KbeSXUzbqOnHbvT6Yt2G9GStGpHdk+X/DR5naVKcMXJcbveXNcj6FR7BdtKkVCrhMFOW74pQxHh3rZ6q5K/sr7X14xcobOUkrJyxEvpE5fzYvTfGyv4+aTpQwtPehK13eMv5xOox9bvpNznaXLg/3PrNb2N9rKkWqm0tmUk9VGM53/ACR02N9iXaBPx7XwzX9tNos5cWb4+U+R8tqY14Z2jJN9GaNfFTrTvKyufQtp+yDbWFTlTxEKrXSx0eH9m3afFYtYejh4LPOc5bsUuZ0x5JfjjnxZT7Hl6dpTjGObeSS1Z9h9m3svUlS2t2nw8mspUcA8m+tTl/t+PI7/ALA+zvZfZtLG4icMZtCOTxE4+GnLlTjz66+R7Z13KG633NCLz5ztw6v8ka2Y8eu62YUlUjGKhHcikowh4acFyuSrCE6sIL+rO27GMcory5mjV2nPE1Y4egm0naMI/wA+LMau0IYeLhh5qUpZVK3zUeS/NhrbcxdKFOcXXqOe6rd3DSPS+i9DRxmLo1YJ1LU6UXaKj8ori+poVcanR36m/wB19yKlaVV8+kevwOnx1etisRF2lKekaceHRLgTS7dri9qwcY04wcIQdowX15yZI4/7PK0lGVfXcl7tLrLnLp8eR52tXeEk1Se9W+9VTuqfSPOXX4czXwfeYiTbk6VCDzk+L5dZA29NCu8ViJbk99rxVKtR2UerJjMdBU+4w892lLKc3lKp+keh5/G7Re6qNLwUoPwxvx5y5skMR3Me8xD7ys84wei6y/QI7ZOEEp1f9PWME86n6R6/A4K+Mq4ivFSi3Ul4YwhpFclyR1FTGzq1ZbrvP70pPJLm+SNfFbShShKnh5O8ladX70+i5R+YNu3xOKpYSEo0Zb1R5VKqei/DH6v4HnsTi03vybjQTyXGT5L9eBq1sUlBTrybX3YJ5y/RdTq8TXniajnOSill/bFckTbFrYxeNniquaUYx92KeUV/OJ19bEX/AKVFtxfvS5/scdWbnFxg9yknnfj5/oa8nk1G6h+chtNrUqNJwpu0fvT+iNSvioUkoaX0WrZp7T2luf06NnLnwj+ppYWE6i7yUm5Su22WRi3/AEyx061Wd5XUOCX1MKTt4tWtVzRsKEp4ffj7re76nCouEk7ZM1GG1h5RXhfuS/I2qX9OdrJ5ZrmjTglF2fuvNdDboyu1B+8tOvQVXPbcalFuzzizepzVSHeKyf348nz8jTpSjJOMsk//AGvmbOHvRqJpJvRxekkYqxuqH2mmkrd5FZf3Ll5mMaG9Hcm0r+62tH+hg3uSUoSluvOL5fujbc++puajaX319fUm2tNWUJ0Xu1ItRXhz4PkzcprvaN2m3BZ+X7HNTSxFLupxTlay/uXLz5HFhlKhX3G1KyyfCUShThOcHDRx8Ueq4r+dTYwUXO9B8fFDz5epnOhuTjOnLlKDOaeHtavBtJ5prhzXoS1Y5KEqko92m99Pep3fHl66HZ4ap9roKnF5+9C+qfGP84nV11HejWjlvark+JuUpQSVWKaU34rcJ8/X5mdNYtmUZVN2rn3lOyd18H9DirUadOSnFNU6nJac16GxKrn38Fe+VSL5/v8AM5FBWdJybjPxU2/y/QOmtuqlCpRm7PxQe8uvP8szfp4um1KnVinBx3ovpy9MzGpCUob8Yvfp5NPl/MjPC4WFRSpPT3qb6PVfzkDuPNe0nAxq7AhisOlOFGspNrgpK36HzhJ2ufae4eHi6GJpqtQknSqRlG6knofN+1+wlsnFwqUG5YPEZ0ZPWPOL6o3jXPKfroElllmV9BZXzI3kaYH0RCq9iBDQufFEJfJgWzIh/LDyCnEL8iaBagXmAALdcwS4A1ACmVQoAEAAApCgAAAAAAMAAAAAAAAAAAACHDUAAPUEAoIAKAQAUgAFAAAAB6ggAoIAKCAAUACFAAAAB6gAAAAABAKCFAAAAOGoAD1AIBfUMgAoBABQACAABAAAPUAB6gABxF8gQCghQCAAAAAAABeGpLgMAgBqAQQABa5lj7wzsIgZrUr9DEGmWS9BnfUxvmVvyAPJajqMrJXFvIKqzZBfqGAWmY6DXJ6D8gF+AQAqKtNSp9TGxcwLw1LlzzMC3y0AvqZRve9/UwWnI3tibMxu2dr4XZWzaMq2LxdWNKlBcZN8eS4t8Fcm9NSW3Ueh9mPYPavb3tCtnYH+lhqVp4vFSjeNGH1k87Lj5Js/YvYfsPsfstsensvY2EVGjHOpUkr1K0vxTlxfy0VkX2XdjNn9i+y2H2LgYxlUXjxVfdzr1X70n04JcFY9vQppKyR87m5bndT4+143jzix3frrqWzoxWUbHJLBK3u5Hd06C3bnHXSjF5HH1drnbXncVhUk7LKx0u0KMKcHUquMYri8jte0+2sLsul4/HWl7lKLzfV8kfPsbtTEbSxLnXqKMIvN/dh0S4s68XDcnHm5phGW0JfaJVI0UoU4+9Ulw/nI66NGCi5Ri40k7X+9VfLp9DbyxKunKlhqb9W/rJ/zI43u1nKtVUo0afhglxf4V15s9+GEx+PnZ55ZXdabhUrz7yq9ylDJKPG33Y/qaGPdXE4hUaeaStaKsox+i6nZOMsTVd33UI+8/uwXL9uJwYvxQ7qjenSbs196f+58fI2xt02IawlOdLDTvvZVa1tf7Y34fM0oNO1TFJ91a9Ojd3qdXyj8+HM7bFYSNDxV13sr3jSeai/7+v8Ab8baHX9xUxeIm88nepUnkkur4LoE01WsTjMV/TTk5apZacFySMMVVWHToYWW9KWVasuPSPTrxNjEVdyMsPhG4U2rVKlrSn+kehlRwlOjT73FRcrq8Kejlyb5R/N/mDTqo4ROl32I3oUVnGK1qeXTqaWLq1KtSMY05RXuxpwWS6Lqd5Vo1sVVTcXKrLKEFlZeXBLkcWLhSwUXGg1Ks8p1Fw5qP6g06KpB4V3tetfTVU/1l8vPTQbqVJSam4wi7znLh+rN6u6cotybjTT1WsnyXXqdLjsV3k1ThGyTtGCeS6+fUM1jjsXL/So3jST04yfN9TSqV3Sl/U8U+EHovP8AQYjExp3hR8dRvOfLpH9TQnVhSusp1X6qP6slqactaq3J1K83eWduL/RHDUqb9pVHur7sF/PzNOriEpOTlvS1bfA6vFbWbbVBXfGcvoT6nx2mMxVOjHfrTjFfdgtWdNito1cTU3I/06eiS1Zo1JzqTc5ycpPVs59mYV4rFbneRpQhCU5zlpFJfxepqTTN7ZTp7yXC6yfU5tn1+4e5UjKyd00rtM5qWHlVw94q75E7vNSeUlk0bs25S2M6uJjUjalDJK9krK/M4qUd+G7xWa+pyOKg1ONlF6Ll0InuVbwz4okNsqcXKO49dUclNb0bK+9HTqg0t5SjxzXQ5GrONSOSf5MVZXLCW+t77y97r1NzDz7yKj96Ky/uXI0mrNVI5X/JnPBaTi7LpwZmtSuywsqcvDPKEuP4XzOeCdCpdJbyyaejX6M0oSvHfWT++vqbtF99TVNvxJeDr/b+hlpyVIunapBtwecej5eZzprFR321GrHN2Wj/ABeT4nBCyi4N+CSzv918GWkpUKt0k5LJrg1+4R2eAl3lN0Zq008lbSXL1N3CKM6csPLJT91vhL9HoddKmm1Vpt5pNZ6r9Ub1T+pS76Lvf3rcJfuHSMYRhBzo1U4J5O/3XzJCapSnSqp7nuTtw6o563/eKCqr342VRc+T/UOjLE4dv78Vbzj+q+RDTawrUajp1bSbSi2vvrg180bVOluxeGk9XvUpdf3+ZpYWi6uG7uT/AKlPOEunL6o3cPLv6bpVJKM4u2T+9+jDcpUi2lXjC8o+GrBrVfz8zGFN02lGX91Nvj/PmbVK8rzUbzit2rF/eXP9S1aEXT7uMrJveou1mnxi3/PzIvbOUYYihutW3lZ358PU8/2i2VTxezq+CxElGLjvwm1fu5Lj/Op3WHqayjdfdqR03XzOWtShXhapFNNWlfjzBZuPgeIpTo150atlOEnGStxRx+TO47W4CrgdpzhU1hJ0pPnu23X6xcfzOkZ1cNMn5hswbaQv/wAgZX6i5jcJgZPQX5mN+ouBk2QlwEZXzF7mI9SKyuDG3kCjXKQplQEKBCkAApABQQAUEAAvAgAFIABQQCgEAoBABSAAAABSAAAABSACggAAAAUgAAAAAABSFAAEAAAAUgAFIABQQAUEAoegIBQCACkAFBABQCACsEAoBAKAAAAAAACFIUAAAAAAAAAAEAGYAC7AAAXAAasLJgIDIEuC7RQTyF2UUeRMy3ZNqFILl2ii4A2BbrkQDaF8sw2QBVv1sXPVGJYoDJXSP03/AIVfZ/LBbNfbTadG2KxkHDZ8ZLOnR+9U85aL+1P8R8P9kvZb/th2+2ZsOpdYadR1cTJcKUFvS8m0rLq0fvLZuGoUMLCjRpwpUqcFCnCKsoxSsklySPL5PJqesfR8Hg9r71y4em6cVfU38FFyeZqZZWN3DVaWHpTr1qkaVKCvKcnZRXNs8WMfSyy1HZKNoqJ4vtp2oo4BywOzbV8ZfdnLWNJ8usunDjyNHtN26lie9wWwm4QStUxcssuO7y83nyPFJSndUZNrSdVvjyv/ABnr4+HfdeDk5tdRpY6pUdapWxNWpWr1Hdpyu2/7n9F+RxxoTlJVMVLuVH3aSyl6L7q6v8zbjB0qihh03O1m+PmuSNWs4Um5S/qyvn+FP6s9cmnk9t3tnJVayjeSpUIZXT8KXJfikcG9Vr1lZqjQpLJN+5Hm+bf5nLUlFNTxE3GVsofet5fdRr968RBqEY06UNZP3U//ALSGhySxCrbtKjTkoJ3jHjLnKXX5HDGpOnJxoS3pPJ1Vw/2/qatStaSo0k3GTUbJeOp0/Y5O+o4WSUlGpVWW5rGD68300+RWbHPDBxdGM685U6fvJL3qnl06v8zQx0ZVnDD06TjTv4aUF8+b6nP388TKpUlV0fiqTeS8/wBEdZtLbNHCxnRwza3spTfvSy0fJdPjcztfjlSoYPPw1at+jhT/AP7P8vM05151a0nFxSj4pzqP3f7m/wCM6LGbTsnUqVHCCd1uvOXSK+p5/aW2a1e0EpQpJ+GEX+b5vqNm3qdo7bpUISo4aTSl/qVpLxT/AEj0/i6CvtSEryq1Jd3rFLWfl06nmsbtGFFN1JrnuylkvPn5HT19t0ZVXKVR1H00M7SvSY7aFXEVHutRgsklpFHXVq+Xge7H703lc6Gvtty912jyWhoYnaVWro36jus3Ud3i8dTgmoS3b6zbzOpr7TSvGit7qzrZzlN3k7kit6SRZGLWzUrzdCTnJudXLyiv1fyNYyqS3pNrRZLyMGanSKbdW+HwcaN7VK1p1OkeC+vwNfDxi570/cit59eSMqUZ4vFWckpTd5SeiXF+QtI9F2caqRhFXtlqc238O8LjFVjHwTS3l1NfYuPp1cdKEYqFKnGMaS47qyz68fU9JtrDxr4WjUaupws/NFZym3jMTJ04uOqlmjYwdGVOnv33bq8mzKthXOM8NPKazizd2ViKVSj9lrRUK0FuyT+9+oyvTEjq8XvQnvwknF6nNgZqbdOWksk3wfA7PaFHvaO7NRgkkr2srI06WFslVi7p5NcmJdljKlaN4TVk8n0ZzULU5uM07PKVvmjOpTc4d5xWUvozKEHOnfO8Vn1QrUWDlSqcG18GjYg1GScZPdecXfTp5nFSg6sXBWTXudehaMP/AA5O0Xnd/dfMmljs4TjUg6iVn99defqcsL1Uo3vKK8PVcjr6DnRq2kndZST4m3uOM4yjJuLV4y/nEmlbeCqpJ05u0ZO6f4Xz8uZ2GGqqhVfex/pVPDUilo+aOtcE33itnlJLg/3N7D0++oTpyV3GOnOP7fLyGmpW7TjKhiG4pTi1d8pRZtOm8K41KTbi3eLa/Jmls+SjfB1ZZpJ05c/2+p2GGnTjCVGpvbstVxi1x8yVr6soWtXo3jBvh9yXL9BiEoVI4umtVuzivi19V6nJR/7vOUKkXKMrJpcVwa+hyUl3NRwqXcJq91xXBrr+6MtOajUVW1eFt9K9+E1z6nPFUVFzSfcTdpR4wl0+hoqhOjKSg1ZPeSXDnbpxt5mxTqNKVSmouLsqsOGfHy+TEajKvhpKqqtNKVVLNcKsf1LCMbrxXUvdb/8Ai+pywkoKzvKg3k+NOX6/Mzkqck3Ul7yvvLSX93RlXTw/tH2N9swc8XRh/UjFKStrb3X816o+TttPqj9C4qCquUKkbtLdmnxXP+dGfEu22xqmxtuVKLT7ir/Uovo9V6PL4Gpfxyzne3TN3zITroOBpzC3MVlqVtfxAUcSaK1/UagUXIHoBXrmDF+ZbvgBbgmQA4QCmVQoIAKQAUEAApAAAAAoAAAAAAABAAAAAFIABQBAUAAAAIAAAAAAAAUWAhQAAAAAEAFIAAAAAoAhRYABwAAAEAoIABSFAgKAAA+AAAWAAAAAQAUhQICgCFAAAAAGAAAIBQABCgWAhQAAAAIcAACAAFICgCZFAAAAAAAFwAAuAEB8wBtVXmVWMUUqPsn+E3cj7RcbWdm4bNmo+tSmfrXDVnOmlfXgfkn/AApQUu2+0W9Vs92//wCkD9G7Q7RU8FTnTwlq1e9k9Yp/Vng58LnnqPteHyY4cO69NtTa2E2VhXWxU3d+5TjnKfkvqfP9vbdx+2Xu4qq6OFTvChDJPk+vmzQxleviMU8RjK06laT9xu9uj/RHHVlGlLvKm7UraWfuw8+vTgeji4Zj9efn8m59T45FH+nHf8EPu04vOfJ/u/Q5lUcoR35bkIPdulknyiuL6nVynKTdatKS3ndQv4qnXpH+I41WlipylJ7lKL3XJLL/AGxX86nfTyuzdVzhOjRjuwWcm3l5yfE1ZYmnSlFU3vS41Hw8lw+Zq18crQoU4yUVK0acc2315s1sViY4R947Sr8+FPy5y6mkrbr06Ped5iXK+vd3zf8AufDy18jRxOKnXrRpUYrcgtNIwXXkup1yxE8Q5Sc3TpRl4pyd/wDl9DU2ntWjGl3NG8IXzvrLrL+ZEXbfxm0o4aEqeFlm8p1tG+keS/NnUSxsYU++rVHCCednnJ8o/qdHj9oKlBzrzb4xhfOXV8keW2rtbE4yTk3a3hWdopckuRKz7PWbV7V70VQp3jCLtGEX+fV9TocVtqnG8q9VOTd91vK/X9Dx9baFWpWdDBpzn96p+h7HsD2A2r2gxcJd1OcW1ectEjnnyTF04uPLkumk8diMfV/7vh6teTVk3kl0R6Ps77Pu1e3LONKph6UuMIW/M/Q3s+9mGzNk0Kc6+FhVrJXcpRPpOHwWGw1NRp04xsuCPHlz2/H0MfGxx+vzBg/8PdWtBTxmIqb3V3ZsVv8AD3QpwcoYmaf+1H6WnOnF2sjCUqc42sjl/Ll/t1/hw/0/J20/YfOle09/ru2PJbV9kuNw7e45ryP2liMJRmvdT9DpNo7Hw9S/9NZ8LGsefOOeXi8eT8P7R7B7bwl3Cl3qXDRnncXgsXg5uGJw9WlLTxRaP29tHs1han/gxXoea2r2LwVaEozw1OSfBwudsfJv68+Xgz/1r8fkPv3aT2Q7MxTlUwkZ4Wo+NP3f/S8vhY+b7d9m3aLZdRzp4f7bRjn/AEvet/tf0ud8ebHL9eTk8bPD8eMn4aagtXm/octOTo4WbXv1vCukePx/Uxr0K9LESpYilOjUT8UZxcWvRmFR70stFkvI7Rw+OTB1e4xEKnC9n5Hu9hYx4vZ7wtV70oeKEua0Pnx3/Z7GvDTpVE7wTtUXL+I0xeu3e4zC70lJLxx069DXqYOhi6anKC34a2ydv1O3qJd7dWcXmuqZw16Xc1I4iFlFu0115mSx1dPAQpVLzlKpTlo5O9jcpUe6lZpNNWa5robsqMXHeTvTnp0ZlSoby7qSe9FeC3Hp+g2aacqSoSakt6MlnbjExVJ0qicc75rqjfjBVL0nk/uN6+Rnh6UXalK64xfJ/uXa6aE8Ok9+Dai9Oj5HNOhv2q5N6TSXHn6m3TpqM5U5R3Yydnf7vUzp0HQrNTjeytJc10I0140e9h/fFfGP7HNg4LOlLKMneLf3Xz8jnlQlSq+GV7eKEuaNlUIySqxS3JZNfhfIDgpqVOT3otq27NcX+5tUYzpVozg7v3k+aM5RdSm5JeOmrTXOPB/R+hng470VTSu7XptPV8Y+v81FGeOwveQUqLSb8VNdeMX/ADkMPipV6bmk3UgrTXFpa+q+XkbeDj3tKVFtLes4X1Uv30NLG05YapHF096KlJd5bWMvxfz6kV2mGqLEUFR3kpL/AE2/l5P5mxRtKl3VRuNnk2s4S/TmdTSqQynHKMspRWkX+j4Ha7yxFNzSbqRj4lb3lz81xM2N41yU7uLpTvGpTfhfHy/T1OOf9Off0krWSlHhn/8AVklKUlvRbTgufvR/VfLyOSU3dVI2akt2Say8vJk00xjWjSbqQ8VObtKMuH9r+jOdVIKFob06Unpo4v8AX5mjXTo1JSgt6E1Zxlx47r69fUwp1nRlrvxnzyuuT5NFhK36sZOUYvd3kv6cuE1+F/zodB292FDbWw5RowTxFBOpRds1Jawfnp8Dv6coum4z3pU5u6a4P9eaOZRvFxk7yte60nHn5l/+rdWPze01waaydyXzsz1PtM2O9l9oZ1KcVHD4tOrG2il95fHP1PK9LGnnvSu19QTMLMoqfQlyAiLcXzIL9Cqyb5ku7E6gmxlvL+L9wYXX4UBsYgAihSAAUgAFIABSACgDIAAACAAAAgApAAKAAAAADIAACAUEAApAAKQoEKAAHAD1AAZAALkAApAAKQAXiAAAGXUAOIAAAgAoIUCFIUAAPUAAMgAGQAAEAoIAKAAAAAAAAAAAuCAUAAQoAAcALAAAAKQAOIAAAhQHALUBAUhQAHEAAAAAIUALgAAOIAFsRGSa43YEs9Te2FsfaW28fHBbMw08RVebsrRgucnol1Z6j2fdgNrdq8RCrCEsLs6/jxU46rioL7z/ACXFn6C7NdmNkdn9nRwGyMNBWW9OpJ3cv75y4v8ALlyCzHf15P2Y9h6fZKnPESxFSvtLE0+7qyi2oKN092K5XSvJ8uB7LvXGooUW6lWWTlHO3+39RiKU6k5UsM7xavUnJ2uubfCPQ0nPum6GGjOUpO0pW8U+nl0+I1I7b1NOatV+zq1OV53tKaenSP6/A4ryovvKy/qfcovNR6y69PiZKSw15x/q1766qn5f3ddFwNahRdSSrYhy7vVRvnUf6c2aifSperfEYic40m7t38VR8l068DQxe0JVakKNKm1LSEIvJL+as5toVqmLrd1SjGUrWunaMYr5RR1mMlTw9KVKhK9/9Wpxl0XKPTjx6VXLPGPDbyoz3qjyqVU/yj066s6mtj+9k5TnKFGMvNyfJdf558VWalHvKrkqKfhgnnUfTp1Oh2jjJ18RlHxaRjHJRXJdOoYtdpjdquaUUnBRdoQi8l+r6nTYvaHc5ytKpfJPNR8+b6HW4zaMKF4U5b03rUT06L9Tpq2OhDxzml5vJGbWLduzxOI76UqlVtuWebzkdPiu8xtdYXDavKclwXJGrXx88TVVGg2t7Jy4s+2+xT2bPFQpbSx1J7mThF8epw5OT1ejg4v5K6r2Xey3EbQq0sRiKLhR1zWbP092O7OYTZOFp0aNGMVFLRG3sXZVHB4eNOnTUIxVrJHd0EoxyR4c87lX1uPCYTUclepTw1DhdI6p4qrWk3ey4I58enUlZ6GtCO5dy9DGnaSLeV7t+ZmpW0WRE1be4GEpK/TgNF7ZuSfE16qT4oTlKzSSRw8M7sMacNempO+pp1aCd00jcqO0tTjk/FdZhdOpxOzoS+7b0OtxOxqU01KN79D1LSZjUoRtoTSV8w7Sdh9l7UouljcBRrx4OUFdeT1XofLe0nsRhJyq7FxssO+FKut6PpLVetz9MywkJcDgrbPpyXu/kdcOTLH5XDk4cM/sfh7tJ2P7Q9n23tHZ1WNJZKtBb1N+q09bHWbPUqdN1ZNbkpbtvTX+cz9v43Y1KrBxnBSTVmmsmj5h249j2xNrJ1sHGWzcRm1KhFbjfWOnwsevDyZfrw8nhXX9XwzZu2VRpRw9e8ow9yazaXJm69u4PdalOLTWaMO13s27UdnnOs8O8dhY/wDjYZOVl1jqvl1PFO989T0TKZdx4rx5YdV9E7P7UwmLnPCKom7XV3w5+h2/cSc91rdnHTM+U4atUw9eFajJxnB3i1wPqnZfaFLbezozgt3EUlacb/l+gqLicPKd60MtN5Lg+fqckqW/CNVrP3Z258/U33Gz72EVpacdL/z5lhCNCb3oudKouHFfqibNNWVNVqaqR96FlLryZyxh39Bxl/qUll1j+xyum8NW3orfi1f/AHRf8+JalN0Kqq05XTe9Fviuv1KunBh4d4u4k873pvry9fmZ4dxoVpRmr0pq0lb4NdUZYijFWq029yWcf7XxXoctX+rFVreJZTS/Fz8n+pTTjkpUa6dk3FaaqS/RozrUo0nGpSk1Tn4oO+n7ozj/AFcO0sqlON1/dH9vl5GWCjGrB4aT9/OnJ5Wl+j0+BRzLclatopZSS4S/fX4m3WhTrUpNxjJTW7UXN8/X5mhhJqnKVOrFpPwzjbOy+qZuUp1KVaUJLeg1Zv8AEunzRmxqOkW9gsXLD1E5x3bpv70P1+qNqjiZ0Jx3Z3+9CduH69DZ2zgZYinFwcXWhnTa+908mvzOpoSjKk6cvDvO6b+5Lr8n+w+nx3vevdVWk1BN6fgly8mc6io+Oz7ufhkl918vqjpsDiHSm4zg/wAE481/M0ztKE406kt7elCa+MeDXUlblcvhV41Itp5StxXNdTXdONGThNN06jvdZ5cJLrr8jclHcVpeNJXTT96Jrz3b9xKfh96lLk+XkZi2OLD1a1CpKjO84yd8nquEl1/4Z2GGrqmlGrJuDe9GSWnVfVHXKKl/SqycWn4ZP7r5Pp8jKhOMN6lW3kr2fOL5r68zWkl00PaPsN7W2FUhThF16S77D24taxXmr29D4ctT9H0nOUPss6kFK16M7ZX4ejPjvtI2A9mbSlj8PS3MLiajUor/AMKr96Pk9V68hOumc5+vJsgfUmZquZfgACKXAAB3eYzsAAv/ACwFwBiAABSAAUgAFIUCFIAKCFAAgAFIUCFIABSAAUhQABABSAAAAAAAFIAKAAABABSAAUgAFIABSAAUAACACggAAACggAFIVAAAAQAAAgAoIAKCAAUhQIUAAAAA4EKBCkKBCkAApCgQoAAAgFBAAKCACkAAoAAIBagUAAAAAAFmAIWwtmBCiwsAAsWyBtLCKvJJtK71fAy4ZE3Wy6I/ZGP2Rjdg08DhKlXD1MJUwlOrQxWHVqFaDis49OUeq4NGv9tdd7kJ91RhnOUvm+b5I7X2HdltubQ9iOB2D2mrNYtt4nZHeRtPDU2rwpyb4PPLgpJcLLym0KeJhi54CpQnSqUZuMqMnZqS1cupMMpk9FxsnbsKuLliJRoYWElRlLLLxVH+J/yyOGtKGHvCjJSqSuqk0/yi+XNnV18X9npulQle+VWtfXpHp8zip4qOHj31aF5yzp03n5OXTkv496Zb1OPduM62fGFJ8er5R+f5nHWqVsXX7mnZyavKT8Kil8oo62GJqV6zUqtnfeqTk8orm/0Ljtp0aOHVOkpRpp3u34qj5v8ATh5g3o2jio4am6NGTVLWcmvFUf0XJfU6HF4m9qlW+5rCnfOfV8o/xHFj9oXbnNubeahJ5eb6dDosZjKmIqyk6mSznKWSX85Dbncjam0MRUqNqfnwUV9EdDi8ZJ3p0puz96XP9jPGYh1pOnTvGnxvrLq/0OvcKledSGHUFTp51Kk3aK/nIlZ3tw4qpCEHKcvFr5fudZKpGFJTa3sRVV7yz3I8EuvU5MfCMk/61Scs7eG0TsdmbFnHZVbaeLTu6TVCL5W979DFsizG5fG17Ldgy232mpQa/o05KUz9qdi8LDD4GnSpxSjBJKx+dP8AD3sju8FPGTj4qksmfpPYE1Sw8U1ayPBz5byfe8Lh9eLb0ybjTVjmop7jk2ddDEKVk2ZVcZuw3b8OZwd7iY3Ebsm0/M1HiFUss2aGNrynKzlYxp1dEvgF07PvObJv3btmaaneNk2yxnJSznFMqNic7LN3ZwSq524knk96935nHKSb0zJTSTk29SWsiPMkdc3cg5FLPM5k048zWTza5HIpdQxZty2MZJWfEsWZOOWWpWa4J01NXRqV8JvRd1c7DK+asy2UldMI8zjNm05xacVbjkfP+2Hsr2Bt9yqVsGqFeV339BKE79eD9bn2GdFSdzhnhYtZq5cc7j8ZzwxzmrH457a+yTtFsHfxGCg9qYRPWjF95FdYcfS/oeM2HtPEbG2lDE095brtUhe11y8z924rZ0KifhWR8y9ovsq2N2ijOuqKwmOemIoxs5P+5aS+fU9fH5P5k8PL4f7g8Bs3EUdp4CG0cLaVOov6kV+ZsRw0d3u5O0Ju8JW92XX6nlsFszbXs726sNtWi6mArS3d+N3CXVfoe8lTouhGpTlv4ast+D1t+56JlL8eK4WfXW0qW9B4acd2cXaKtx4x9fmSnQi4ug8lJ3p34S5evzN3EUnPVeOC4P3o8H5r5eRlVgsRRdaLaat3i68Jfr18zSaddQjBb9GScYzfH7kuD+jOOCVCtJSg7W3Jx5rj6o7KvQWJpSqJf1IpKoufKX0f7nDOlKvBzT/qU1aa5x0Uvo/Q1CtCpGph66lBpuNpRfBr9DkqwgpxrU793Uzj/bzj6fKxyKHe03RdlON3Tf4lxj9V+5xYRxhU+z1rqnUV1J/dlwl+vQ0kcmKU6rjiY6O0altU+EvX5rqcuGU6lKVGyc6fijb70dWvTX4mEG8PVqQqxeu7OHNfzQ2FTlRxFOcJLeik4T4NcH/OpmtSM6cpVaThdeFXXVatfX4nT7Uw+5VWIiluVfftopc/X5nd14RpzVal4FPNJaRfFenyOLGUqdenJaQnF5fhfH9UY+FdPF78E7eKC+MV9V8vI3sBUjU/pOcUnnCT4P8ARnWONSjN06jtODVmuPJo5VJJKcUt29pRt7r/AEfA3pPjvcPUm13M8pRfgus7/hZjiIRfh3cpZw6S4xZwUKscRBXTVSCzz96P6o2YuNWm5N2Tynl7r4S/X9zFjpLuNXe71JON5QWn4kuHmvkXd7+mlTkt9W3Xf3/7fPl8Biad5b7TVSFt+z/9y/nzJUTnDvYJprOcV/8AJdPk/MsrLLC104qlWe6k8m17j69OZO0eBo7T2ZXoYqm2nT3a1lnZaTXOUXn1RlUXfwckmqsc5f3rn5/M5cFUckk53lFWhfivwsti7nx8E2zs/E7K2lWwOKS36b95aSTzUl0azNM+re0ns68Xg1isNTvVoxcqO7rKGsqfms5R6XR8qa5FcspqoC8CehNIAC4AAtuYEyAsBo2xAAUAAAAF0BSAaApAQAAAKQAAAAKAXQhSAgFIBoCkAAADQApABQC6AAgAAAAC2uNCApBoCkBABQXQgKQAABoAANAUhSCAosBCiwAACzLoCFzFmQALMMCFCFiiAthYCFFitW4jQgFhYaAFIrDQgKMhoCFaFiAQti2LoQDMqWRNCApMrl0AFgxoAANABYcSCIpQXSbQAo0qCxbIWGhAtQEgLlzFhZFKiWRfUBaALZaoPlcFAgAAFACDIAFZxWZ9g/wz+zmPbLtRLam0qO9sbZcozqKSyr1tY0/L70ull94+V9n9mYzbO2sHsjZ9J1cXjK0aNGC4yk7K/JdT+gnsz7KbP7G9jsFsHZ+7JUIXrVd2zrVXnOb838EkuBx5uT1mnq8Xi98t349FGko07cXxR4T2qdmqu08HX21gIJYyhT38dGMfFiKcbJTXWK95cVnwPe3V0jT2lUlRSrUpbs6fii7ZXPJx8lxy2+hnhM5p+aq9Snh4xlJRlUfuU3mo9ZLnyR1cO/xE5SnUV7uUpS+71Z7X2n9nKWAxS2/sxW2Ti6lqySbWErcYf7Xm4/Dz8Ji8ZTlTVOF4wTvbjL+59fkfRmUym3zM5cbquDH4tRSVNuFGDur6yfN/zI63FYypTanUd6jV4wfDlJ/RHLi70YqrUSlKWdOm9F/c+nJcfLXosZVlOU51Ktmnec5fzUrltlXrOvUk3PdSd5yf816HUbSxibcYvcoxzt9X1NfHYudVqnRTVOLyV9erOnxdX/vFOnJt0lm1+JkYt27KWIqToy+zYepKC+9omaFHEVacJ0KjaTnvyjxb6mu8RVr2q1ajSWSVsl0SNrZmEq7QxPdxe7GKSnK3ur9Rb0klt1Hedk9if51i/tFaDWEpSvUd/ffCC+p6TtPTX2WdNJJbtlFLJI7TYUKOE2bChQgo04KyX1NHbMu8kou2cjx5ZXLJ9Xj4phhr9fS/Y/g44Xs5QjZJto+qbOk93dUkfN+wc409nU4JWR9G2PKMrS48Ty53dfV4rMcdO6w8ZatnHjJ7sXZ8Dm31GJ1ePrK7Sa6Ga1tq1q29POSLSrJNJu7Zo14t1N5St0OTDUpylfMzta7OnXtFpK75JHLF+FLRvoYYek1923mbbpRUepvTltwSbSyk2zDfy6nK6ajnY45Tzs4IzWmDm1ZX1ClaWbVjiqyTdnGy1OKUs83kSjeas7p6lT4M06dZxybucirxauTbLdi1u6ryKpSdrNeRqQrq+fHicveZqxdpcXPZsygl5P5nF3yauO8i1Z6BNOe9lYKN1flwONVEla9zJO9nFhLik6dzgrULrNZG2pbwdrWaDDy3aLsxs/bmz6uB2hQjWpVFxWafNPgz49V2HjOxe1P8m2jKVbZWJk/seJl92X4Zcnz56n6GsnezzR1XaXYuC25surgMfRU6dRa8Yvg1yaOvHy3CuXLwzOPiFSMlJ02t2pTfgfHyMobkFHFUIq2UakOCb/8Aqzn2hs7GbLxs9lY+8q+HV6VbRVqXCS6rRmCluS76EIuM/DVhpf8A5+Z9DHLc3Hy88LjdVxzpujV76i96E8o735wl/M9ThqUJ0cSq1Lxpq6b0kuMX8mb0YwouUZb06NXPTO3B/wC5fzUm4qTlRrSvCdpRlw6TX1/Y1tl0+Nw3dTVSm2lJ70Hx/wCUa+Pp76WJispO0kvuvivJ6o7tRipVMNWdlLRv7kufk/0fA0pQVCrOMoN05rdqK2nVdUblYrXpP7RRV03OnFJ85Q4P00+Bt4OHfL7MvfXio83zj68Ovmaco1MLirpLeir56SX6NGxVik41YTdn4oO+nNeaJlF25Yyhuypze7vcX92XB+XBmEYbsZUn4W8s1pJfyxz42UK+HWIglvN/1YrTe5+uvxNepKVajvXtKKW91XB/T4Gb8V1O1oSnTjWgvFTVpq2duX1+J19OruS3opyUkt5X96P6/U77EKP+rwn4aitx5/X4nQ43Dzo4ncXuTd4W/F+H14FxSt6hUdCrGcZ8VKErao7elu70cRGLlSnlOKejeq/Q89hKq3e5qSyeab+6+flzO22dW7iUoThJp+Gcb6r+ZoZRcb228RG39Smt7cjx+9Dr8v8Ag4Zf0pKpSk3C2T1tzizaa8bhGUW/fp3+8nqv51NSbVCUkk5Uamfl5dV8jMbyYVEoy7ylJqLeWfuS5eXJnJGfe0nUh4Jr30v/AJI4pN0ajkkpKSzXCUf58DGSlSaqUpvdk7xf0fXoaYdjeGKoPvPejnKy0a0mvr+58f8AaJsF7J2p9qoQ3cJim2kllCfGPlxX7H1elPdffU5Wz8SWkXy8ma/ajZdDbmyamGnZKcbRbX+nNaP+cLj9L/aPg4fxObG4athMXVw2Ig4VaU3CceTRwtGnNB56FtkRLICpJl3bkzXMXy1Ay3eoMPiAMbCxQQ2lhYvEFEsLABRiwAAW6FGoRLdBYFQVGgkUBCwt1GYIFiFBRPIZFAEsi2QCAEyKAJYtgAGXMNcQAFsgABMi2AAcCFCBs4EXQth6ACIvAALBpAALdSWRSuwNsWhYoBtLFYAE9AVBg2IWACDTCAIoLAFCwzAAAAASxQAHqAEPUeoAUAsOIQAHEBkLABURQAFgEgAsX1BAh6gAAAAAACgACHqPUFCoPUpAgAAAHQIAEAtQqgpUswMbFsVjiES3EWLbOxbAS3UlstTOyMbJsCAtrcABLDQp6f2Z9jsd247XYPYWCvGNR7+JrWyo0V7038lzbS4kt1NtY43K6j7F/hD7DSqYqt25x9F7kN7DbNUlrJ5VKi8leK85cj9TUVu0rROo2HsjA7C2Nhdm7PoKhhMLSjSo01will5vm+J29J2pK/qfO5M/fLb7fHxzjw1HIufE6LtNiu7w8oRdm0dxVqKFJvieQ7RV1UTV8uJiumMeEx/aWlsXF1Y7Sofatk4uPc4/DuN96m/vR/uWqPBdstjYfs9jKeLw2Jhj9mYxd7s2uvFGpB5+Pqrq6469Ds/aHODc/FdWPm+x+0SpVX2cxdffwFeblShN5Uqj0cXwv831Z6vHysjw+ZjN7cuLruo51alS2bcpPP8AjPObSxEsTNU6d1BPJLj1fU2duTxEcdPCP3ab8NtGvxO511SahFxg075Slz6Loex8u38atbw3hTzvq1x6I08RThOcYayvm1z5G7V/pxefjf8A7f3JgcHUq4qNKhHerSTd+EI82Skm700YYJzrqjSzn96Wqies2Ph6OFoRpU1ZLV8W+bNangY4SPdxzb1fFs2sM3GdrHDPLb1ceHp9ekwdVqlu5Gpj3vO/FZmOFq7q11OPFTu3qcnq9n1HsdWvhKVpaxTPpexKv9FPifEuwmNdTARhfxU5brXlofVdgYpywqu7Hlz6r6fDfbGPYyxN6el3zOtxFXeleWprPETUPeOCdZt2csjH11vTdhHftax2OGpJK/E6rC1Vpc7bDYiKjZaCSM21uqEVDJpM46k1Sg25GDqRULt2XA6zG4mzbWvmW3RJts1sV4Xd2NGrjYrK+fmee2xteVC+9JR9TzdXtRS3rd6r3Mb23ZJ9e+njldq/5nG8bfJSPDLtJCWaqK5yUdvRnJZr0YZ6e3WKjbN2OalWTeTPJ4bakKl4uS6ZnY4bGZ2uRK9Cpq2pyU6tla501PE72jyNiniVpcGnbqpZWvkN9qV7qxowr3jqXvU9GVG93r4PIzhW4bx1yqmfextlqE07GNacHdO6Ob7RvRy1OqjWtxM4V7eZWbJXYd5fNZM5N7eilozShVTs07marK+tmDToe3WwVtjZ6nRSWNw950J8+cX0Z8nlNQl4ozjJ3VWFvdzzXmfebqUeZ8y9p+xPseJW1sNC1Gs92ukvdlwkejg5NXVeTyuL2ntHmcN/TlKhWmnGVnGT0T4PyfH9jmSdWk8K2lKL/p3Walxj6/PzNKnVVSg4TzlTzX+3ivTX1OedTvoKopNSikpNcuD+j9D27fMs0y3HXo7jT34LL+6K4ea+RxYmDrUXU1nTS31+JcJfR+hz1ZOpH7RTk4zTSqW+7PhLyfzuY1ZSg1XppZu0o8E+MfJ3yNS6Zs262rCVaioaTpq8f7o8vT5GvQd06Dkoxm7wk/uy4eSehv4qk4VY1Kc3b3oPl081ocOOw0J0lXpK0J52/C+Mf06HSM6048HWdGco1YPcl4KsbZr91qctWnUw9aytLy0nFrh0aOPx1KXeyS34pKp15S+j/c54OU8J3cspU4twfFx4r6/EmUalakoKMpU5NWqLJvlwf6+pobQw6xOHcFeM46vlyfozenU36Dg7XhmusW8/z+ZxTqLKq27SW7NW/P8AnI5wro5Tb3pyjuzg92rHk+fkzfwNaWIgqSdqsVeF9Zr8Pny+HI1Nr05UK32mnGLst2a4Sjw/nkcNOe5OE4SluP3WnmnyvzR0+xh6DCV41KaouW7K94PS0vPk/mcldQnGV/Ap5SVvcnz8v35HVzn3r7+Ls3lNLnz8n87nY0ZqrSc5K7slUXNcJGLNOmN304YJrew9ZqLWjf3X+j/cxhLulOlOM7N+JPVNcV1+ZzV6TknGSvUgrPlKP8/IbvfwUH78Utx/jXLz5fDkWJZpjRqToVLNRk2tVpOLN1Pu4ucbypTyaebXTzOvpyhbcm7QbupcYP8ATmjYo1HQlKNWDlCXvJPVc0/zTLpP14j2s9npKMNu4aKlGyhX3eWkZfR+h84eWh+g61OjWpTwGJUauFrwajvLJp5en6nw/tRsetsPbNbA1buCe9Sm/vQej+noEyn66u8vMq58QTNaFZG75MgKgIDLdBehgC26jIiIAW3RgQCxUiqgFhkQBqUnEAMi26iwEyBbBIInoDIeoVjmMzIXYGIMroIDGw4Gd0TIIlhYt0S4CwSXHIXXEXAZEAYU4gZgBbyLbqRaFAW6h5DMBELZXIALxHoQIKAq0Ga4gSwsyhgT0KMipXAxBlYlkEQZF9ABAWwsBALCzCgFsgAVy2ZEV6ZARoBeRWBMi26MWQy6BB2XIl1yK7W0AVMiqwAAC7CAg1RchkBMuZbLmUWAmXQKxbCwQyGTyFsgkwo0iW6FtfkLASwsEv5cqAxsWxkPUDHdKolL6gYWXQtrrgXIK1wjGwt0MgrhWNkLGWYegGNrcRZlztYZgTMIyI8gJmVeYaVhHUA8i3QkiIIoyAAegyAChlGyMQBm3HgYFsNAMoQlOSjFOUm7JJas/bP+HX2dx7D9kFWx9K23NpqNTF3WdCOsaPpe7/ufRHxX/DN7Nq+1Nr4ftntnD7uy8JPfwVOa/wDyKyeU7fgg1e/GSS4M/WGEqT7t1JPXS/I8fPyz/GPp+H41171t1VGTUWskWNnKz0OKM1up8zOE0pXtk9TzR7LK4NotKi+h4btJiI06U5N8Gez21XhCl1Z8y7eYxUaTgmsya3Wp8fH/AGhbUSdW8tL2PiuJxLrYudVN5yyPae0/aLdV4eEvFUbTS4LieDjk7Hv4MNTb5Hl57y025YzFTr99KvOc3a7lK9/M7fA4uE6W8/8AW5P7vVczz/lcyp1J05qUZZo9Lx6d5XkqFN1qjV9YxfzPfdltn4GlsaFbDVY16mJip1K34ny6JaWPlGJxFXES3qjvY7zsbt+WzK/2XEzf2SrK93/4cuflzOXLLZ09Hj5THL+z3GOwNpZLM62pRdJ6ep30cRGpFXd15mti6Ss7Zpnlj2ZyfY6unNryLOe8s9RUpO/JnFmnZmnKyu37GY14baroydo11Zf7lofWuzu0NzwyzR8OhJwqRnB7sotNdGfQdgbZhWoQr8dKkb6M48mO+3u8Tk60+qLG0HC7djTxG1KMJe8mjyGI2qlDejNO6yOvWNr4mooxZw9a9lyj6DgNpQrTtF/md5hsRaN2eK2DQlCO9K9zvHi1Ti02yyHs7+rjlu+9bI6vG4tu9pXR0mL2pK+TsvM6zEbUW8/G2yVV2/SlinKMpZPSzPmfaLZe2cFiHWwyeIot33VlJHv5YrvJ3c8r6G1Q7irFxqRTWmhnHeNM5Mo+P0O0NONVUa7nRqL7s8jvcDtNNJxn+Z77F9ltjbSh/Uw1K75xR4zb/s/xmz5Otsmu4Qvfcfij+x098a8/rni38HtTNPj5nf7P2po238T5dHaOJ2bXVHaVF0Xe2/rF+p6HZu0oSinGat5i4NY8r6VhNoxb/c7GnilO1n+Z4bZ2NzT3k0d1h8Xa1mjnZp1l29XTxKStdnPCte1mefo4vw6mzTxN8rpEad3Grda6CFa76nWQrXaak7nNGs/UGnZRqZZ6mUZtvU0adbTU5Kc1e97Daab8K7i8jlVWMmnc67vHfwsKs4vJ5gkdzTqpZRdzh2vh6O0Nn1sJXp70KkXFpmpSqq6bdranN370buiy6Yyx2+IY2lV2XtOtg6q3qlCWTk/ejw/I5KNaFKrv2cotZK+sX/LHf+1nZ7jOntWglvR8NS3FHicNXU6fi3m4reWfDj+vxPp8OXvi+N5HH6Zu9p11Rrtrx06kbNcZQ/X6o5qclCpOlWknCol4uDX3Zfzhc62lUVWhKMJ5wTnHm1xX1+Jt4eTr4bu1JOVJb0f7oXzXpr6s6acY51HOphqi3byyf4Zfo/0MaSdFTo1E4wnlLL3Xz9Plc58sThd951KSSmr+9Dg/TT4GWIvVwnfQznTtv9Vwf0foaiWbde4VcJiZNwU2spLhNPh5NDEvuGp0pKS9+DfFdfkzZnPv8H739SlG6fOPL0f5eR1dao3RnQbWm/B9eK9V8jdT41a04U8R3sfclmo/2vJr5o4nJKU6V14sk+q0/nU4HPfpzg37viTXLj9DhnVk1CV0reHJctPy+RyqWuapu1aXjSdluyuvh+h1dKDw9aWHqtunPxJ8lwfmjsk1Go7O0Kis2+F9PzOPF0nWob8LOpT8TVvy9fmXFlwYerLD1JJxcuEo31X8zOzwtSNKpGpG84S0v95cmdXTXewTVt6Mcuq4rzX84Gxg6kN3upS3U3eDb91/o9GaymyXTuarUoKdK7cY70HxceXmjhqSjUi6lNNJLxR/C+a6fIywM5OLpvwzTyvlaXL1Jir0pd/RSUZeGUWvjFmPjr97YSkq9LeS/qRzmvxL8S+vx5kjWcodzOaiv/Dk+HR9DhqwdOcK1KpK2sXyfJ9TGUo1I78I2WW9D8L5roze2LG1QqQs6FZuMW9XrTlz8uZ1XbnYb2/seSp07bSwd5U+dRcY9b/Ox2aff0df6kF/64r5tfLyNnBvvJwan/VgrQf4l+Hz5f8AAP8A4+ASTi7NW5pjjfie49p/Z/7JiltrCU93DYmVq0V/4dX9Ja+dzxDQYsQAW6hGXwBM+gCsL9Q2LX4iwRC3G6LdQpwIUq6BGJS2AECbDFgpmGCgT1HmUZPUKmosUIIlhYyJa/ACWLZiwCJ8RYo1Co0LFAGOXQtkXIZBUsLdC5AIxSFuhkAIkGlexbC2YQfkyF4ADEGRLhUsLWZl5EKFudhbyKCCNESRkCicMrFQBEGCkyCj8xdAKwBDoAAyuLIFCo0PmUIIiFigIEsigKlhmUASxLZcDInQCW8hYyQCsbdS2LYBEsUCzAlupQAAAyAEAyCnkC+pAGQGg4hFyHqAABbECBCgKluoy5lCtzAj/IMuXFh6ASyvwCSRfUfAB0sPzHqgA46Bcx6lswDIZJIl0BGCslkBClyGQEVuJcgVK7AHf+z7s3X7WdsdnbDoxnuYisu/lH/w6SznL0jf1sdJRpTq1I06cXOcmlGMVdtvgkfsL/Dr7K6nYrYNXbu3aUY7b2hTS7prPC0tVB/3N2cuVkuDOXLyemL0eNxXkzn+nv8AB4fC4DDYbZuBoww+Go0406VOCsqdOKskvSxv1cVBJQTy0NLF3vUqwzaVsjToKtbeqvNnyrbvb9JJj1I9G6u7h4yb1WRlh3vpz5Hn9pY2pCUU21GKsrnBHbMlRdOnK75FmWmcuHfcbfaTGJTSvofG/aPtlPETTdrRZ9D21XnKi6jlaVuJ8E9ru0YfZ60ZycKu691x43OmH9spHHk/7eFr5N2jxn27bNfEJtw3t2Hkjr9TKVk8jH7z8j6uM1NPzuV3ltLFsgjIrKWv5EkkXMtuJDb1XY3bm6o7Oxk3yozb/wDa/p8D2Pe3hrkfJbcT2HZjbffxWDxc/wCtFWhJ/fXJ9fmcOTD9j08XL+V6CtbyNGte7tobdSTd7WNaerRyjta0pVWna5t7K2lLB197NwnlOKev7mtWitMzWbW9a5qzbEy9a9pDHPKUZ70JZppnoNhzUrSdj5Z/mU8FOlCN5qpNRcW/zPW9nNsRlJQ3rO5zywsj18XPMrqvqmBr7sbKV2c9eq5x8TR57Z+MVk1I31XlJLO559PdLNNXaO/K6hJo6uXep2cbvod1Uipyvka86KvbJlYyu2hSnJWbTN2hiHF3kcNWjZ6eRwNSVlayGpWZlY77D7Qas07pG/RxyrLcm1Y8nvyhxyObDYmadrtR49DFwb99ux7Q9ncFtTDSvCDunwPl209hbT7PYlzw8ZVsM3d03qvL9D6xhsY1H379GZYuhSx1BxqRjJtFxzs6rOWEt3HznYe16NaF4Sz0afB8rHpcHjY2TPJdrtgYjZ2KljcD4ZvVcJeZrbD24qt6dS9OpHKUZao6amU2zM7jdV9JpYxZWz6XN2jik/d+Z47D4tJKSldHY4fGppK6TOdwdZm9XRxTXE2qOJba8SaPO0K7aTvc3aNXS0jnp0l276OJadrXNqjVv0OhhiXupN/E3MPibxWYV20Z2evoXvFweZ1zrJu6ysXvXxIadjTr2utUzKNZ65NHXQqX45HL3it71ippr9p6McbsyrTkrrd0PjrpywmOlRkt5U28uaPs9eUZYeUXnkz5f2ywro4lYims172XA9Pj8nrlp4/M4vbHbQoVVh68Zxlvbvijfiv+DfhiYYbFQq081beh5P8AjR1NNxqYVS3lems7cnp+fzLOcnQupJSo5/8AS/3+Z9K3b429PQSxUcNWVai04yW8k3fJ8H+aOaGKhQxEakXv0pLeUXxi9Yv80eZ+0yngmt5Lus1bk9fzt8Tko4p1MI471txby8nr9GSG3dV8RDC4xyw8t+ml3kG8/C+D/NM67atVUqu9RkmnacM+HL6Gr38qmElTbSdO0l5PJ/nZmpWqSlQlFyypvLLg/wB/mLTZUe7inZ+CWmfB6fM4r5zjZt6/D+Mxk96hB/hbi/mvm/gKk92qqnvXtJ/VfMiM5TlUoJrJwdn5PNfU5qMrVou63ais/r+Zr0/DOdOV7u8enQsHvU8r+F3XlxAtaLoYjebyk9VlaZMSoy/qU0knqlwf6P8AmhsThCtRvK7342bto1x8+Jw4aThvQqRu0lGcVxXNfPzNz4NzCVpVqbvdTivF1S4+aN+MlKMp1FvKSUaqWvSS/nzOmUnQq3hLO+9HLJrmdph60UlUjnCeTj84/wA6Ga1jlpVSVGcqc4uVOSu2s8uEl1/4NerSdCrdbt7a/dnF/qdjuqce73la16UuOfB/zU1ZxXd91Uk1H7jf3Zcn0fEkW1rtyotThOW7e8ZcU1wfVfmbEZqpHvKT3H95L7r5roamdJzpzjJ72UovX/kLvKFWMotNP4SRph2GJp0tpYGthsXTVSFWDhXjbVfiXW9n52Z8Q23gZ7N2ricDOSnKjNx3l95cH6qx9B7XdqI7JtQwM1PFSV1fPu0/xc+iPmtWpUrVp1q05TqTd5Sk7tsnwrB+YX5lfLgQrJvMFAGIACAAACwACyFgVIDGyYt0LYtgMfQFsEgJYtgy26gY2LYqGoEsC+pMgBCi/QKgGot0ADiXXgLZAA76EKgJYWKvUfEIZAWFlyAeoeYsGBAVLoWwViLFsLIAugtmVW0ARLC3QWKBLBIfEeoBoAoEBbCwVLZ6E46GTAEHoWwsBAW2QtYIEv0MkkLAY2uhbqWw0AWFgApxJYoAiTHEyAGItmZE9bhCxF5lyGQC3UitzLkAIwVp8iABmAFBYoQEtnoWwCCCXMZD4iy4gEB5XHoAV2xm+YuLhSwsy3KmgMbMqT5GV1zG91AwUHyMlCVy7/Ud4+YE7t2G5Irm9LkVRhEcXYWK53yIwG75XFiXeg6BS70BQBCmTRiAsxYtwnmBCxV2ZZH1z/Dj2BwXabatXb22qaq7N2fVjGnQfu162tpf2xVm1xulpcxnnMJuunDxXly9Y91/hj9l8cHSodt+0GFviZrf2Zh6i/0ovStJP7z+7yWerVvs3aztVhNl4WSr1lGK1uzPtFtfDbN2a25xhJrysfnvthtDGdo9uUMBSq/69eNGkm9ZSkkvmfNzzvJX6Hh4ceLDT9C9msTDavZ/DY+GUcSnUhdZuN7J+qV/UsXGW0fs+9wvb1OfD0qWzNl0cNSio0sPSjTglwjFWXyPF9ntuyx/tMWCpvepww1Wc89LONvzZnTdl+vT9qaO5hZTWVle55DsnjKGPqYhQk3Vw892pF6q+jPZdrK8PsEnfhzPhXYntJSwHtans2Sfd7QhKlv3y31eUPlJeo9Pb4s5fWdvpXauc4YKe40pbr8j8ve1TaFartGGErQcJxbm+TWit+Z+pO0t6lCa6H5w9tezu6lhMWopPvJU211V/ozp4+vft5/P3eLp81uyZmVrlsfTfnWPxBWrcQ7dSiJcCh+pMiKyRVJppp2ad01qjG+fG4FHr+z+2liqaw2IaWIjo/8AzF+p2c5Z35nz2LlGSlGVpLNNPNHqNjbV+1w7mtZV4r/1rn5nHLDXcd8OTfVdnNpvJmtUS3tMjYe67tnDPXW5i1q11eIvV2vTileNCDk/N5I3qFWpSqqpTlaSOHZlLvI18Tb/AFart5LL9TYdJxlbMZVMf9vedmdqxxWHV3uzXvJ8GenoV1GN7s+S7Pxc8FiFVhfqr6o9zsvalOvSjUUm0/5mcMo9/Fy7mq9VGvvLVeQ37q7aOqjiFa8Wc1PFReTeZix3mTflJWza+BxvdetjW7261JGqo5k0u3JUgt6yjfqZKNtTiWJW9eyMniIyXDoLE25qc7Sy+ZvYevuxylZcTpKlVp3TsZUa0lnvZMzcVmXbuNpUIYzDyjJKV1yPl/avs/WoYj7RhvBUjnGS49GfR6GKkko38JMZh6WJptSindZExyuK54zKPmGxtsTlehXvCrHKUWelwuITgnF5nR9rez8qNX7Rhm41I5xkvk+hp7A2rJydGveFWDtKLO33uOEy9bqve4bGSjHXI7LD4uMrPePLUsXFxupX9TYpYpprxWMXHbrM3q44l8zno4m+jPOUMS2spG5h8Sm915M53F1xzeipYm9s/I5o4lt2ep0dOs1K9zbpV1JLRMzp0ldtCvJHLTqtttrI6mNeys3octOu7e8TS7dlKtvQdvhc8p2loqpB5LM7qdfw6nV7QfeUZNmsLqufLdx8/o1FhcTOjUyjLw3fJ/o8/QtOe5Xaq6NuM/LRmfaHDvf30rNZmlOcqsKVVybU1uyt+JftZn0+LLcfC58PXJzuSoVZQlkm3GXVaHFhq8qGL3KivGMt2Xlo/wAhXbnCFRttuO6/NftYxrw/06jXia3XlxX7WOrhtsxmqGKcKmkZOMusXlf4ZlSSrunPJ3dN/K/xscFZqcIS1ut2Xpp+Ra0t6EKl82t1+a4/CwVFdKpBq11dLqv4wkp04prNNr45/qWvNKrGs9JK7X5S/O5hC8JuF82nbzX/AARXPOF1ColZ2s/NfxFSpxq733H8n/PyOTDWnCVPJuUd6Pmv2uZ92p0mk4+DPTVP9/mBad7yoZXenmv1OOVN1JpwX9VLJfiX4fPl1Mqq3qSm34kt15cVo/h8jmqwVVRqptSeUrcJc/XUsq/Wth9ystxXUvu31v8Ah9fn5mdGW5eDe7GWrto+DMsVRtLvXF+L3rfi5+uvxGKnGrR715T+915S/n1LUsbdGpJxdGdt5PLz/c2Jv7TBpX31HO+srcfPmdRSrOpS470Er9Y8H6HZUZylu4iD3ZKynlo+EvX+amfixjKk60FFq1SCy/vS+q+R5btX2kjszDvC0lGripK8OVO+rf6G92z7SUNk01HCyUsbNXUFpTfPy5I+WYmrVxFedatOU6lSTlKT4s1GbXFVnOtWlVqzcpyd5SebbMeJlZESDMQvmZbpLdQogWyBBgg9BrqgVES5FSAYApiXXiBWR5IIZAPUDIegAItmLATIZLgNBdAG1yHoPRDUB8QLAqovIFA6RHoVeQyKQQl8ygBkCkAIDPkAFsgLiwAWZdBcKC3QvC5M7hCwsEVPmBLEazM2yJ9AMbdBYzv0Qy5AYW6EOVKPFfmGohXGhpqclo8w0uAHGLnJZDLiEYEORqJi0rcBoQEsUAHnwBGBVl5ECKswILFsugSQVM3zK9AAIhkUcdAgkg0uY+AQEBQBMicSgCMFAAtgAJl6jz+YRQIMihABl0F+iDAhbAgVSWCKAyJYpcgiELkAGQyAAisXIegsxsCN5FsEnwQIcBqxbncZdQqFWoSKlmBLCxkVBGOY3TPRWJfkFYpcy2F7alQEasfr32MbF/7Mey3ZaxEdyviYvGVlxvUzivSO6j8yezjYse0XbnZGxp/6WIxEe+//ANcfFP8A9qZ+ufaDjIYXZSpUmoeGytwVtDx+Vl16vrf8Zxd3OvlvtP7YRniJ0lWapwu5PgjzXsKqT7T+13AVJL/uuzoVMXuvjJLdi3/1STPO7foVdv8AaD/LqMp9ypb2InH8orqfcPZDsnBbBo1PseFpUFuRTcY+Keerer9STimHH7OuXNlzc/pPj6d2txKw+yas00rRPlXshqOv2323jGsqeEUE+W9O/wD9T0vtE2y49nZTi85XieP9hGLhUxG36tv6kqlGHpab+p5Z3299/rrF7rtpi5Q2fO0rJRZ+ZdrYurhu1UdoUW1VoVo1IP8AujK6+R+ie3eIT2XUUbOWaPzhtdSlj3N5b0nw6nfxZvKvH/yOXrhH6Pp4+jtXZ9HGQaUK1KM455Zq9j5x7TNi09u7Nq4OjVjHEQkp0m9N5cPJq6Oi7LbV2lDZiwFKtJUYu8UtV0O4wuMTluVHeXFy1M5cWXHntcObDn4/V8Fq050q06VWLhUhJxnF6prVEs+R9B9pfZturPbmz4qUGr4mCWaf4105/HmfPr6aHvwzmUfF5uK8eWhxk7WRl3TtexFNoveNHRx0wnG2hjYzlJyZUuQGGfIqTDauPUmlR9SwbjNSjJxazTT0ZcuIbS4BNvSbI2lDFx7qraNdL0n1Rs4uoqWFqVHwi7edjySbTUo3TTunxR3FLHSxtKlh6i8feRjKX4lf9jllh/p1me5qu+wVBUMFRpJWcYK/nx/MynFN+RyzkrGDd9NDlvbvJNNWcFFtM5tnY2phK2V5Ql7y+qEo7xxOlnkNLLY9js/aSnBNO6ejudhHEKVt1nhMHXnhqls3TevTqd7hsZ4U1K6ZzuLvjyPS062dpNuxyd7la50tHFp/eubEMRzaaM2Oszb0qj/FYwjWcZas1nVvoYyq3Jo9m8sRwfxM1XV8mjqnUSazCr9SaT3d9SrxTV2mjfo4mLWuSPLQxNsr2XA2aOM62M5Y7dMeR3O0qVLEUHFqN2j5n2o2XUoYjv6Hhqx0a4rkz3lLEuTbby4I0ttUKeIoO6V7DD+tM57R4vZG1e8haV1JO0ovgzvqGJTStLM8ftnCVcJiniKCzXvL8SN/ZOOVWnGSlqdbP1wmVnVeto4mSyvY7HD4h+83mebo4j8MrG5QruKve5Li6Y56eno4tJLPXU3aNdZNPgeZoYnS7N6hiWms1Y5XB3xzd9HEKWrscqrvTeVjpqWIubEa1+Jj1dJk7CVZyWTyNfFVN2m1c4lWeVjixFRt3YxnaZXp0W00puV0dFh1u1qmFa97xU/9y/VXPSY20pPw+Z5/adHxKcLxad01zPXx5afP58PaMqaThKNsmlKOXFfsN6M4The7a3o+a/a5wRrvWDSkpbyXBPiJ/wBPEKpBq11KHVfzI9f187WlpzUoyjFrOO8kun7XM4brUovRx3l6fsHGFKu5wXFSilxjrb6GEv6VTLNRfhWt4vNFHE5OdBx/DK/Vp/z8zOXvQqrJta9Vr9CyhuV3Hg8rvk9PoZRg5U5wt4o+Nemv5fIDmw9SVGupKSumpRdjs4qnCvvxtKMldJPWL4fQ6eTlKis8o+K/Tj+pu4eq50d26TjG66rj+vxA36dKEZzhJpRmrX5cn/Opx73cucJqyfhf9rWjJTq7+GasrwVn5P8AR/M5a6+00Lq29FJStxXB/QkVwPEKW9CUfu2ml815M1FKpTrSp1I7yStO3FPivmjceHkmpt523Xl/OHyMMRGkqTc5JSprjleN/mv5oU20tyeFru63nHjwa/Ro6/tB2ihsiLhh5RqVqkfDF5+F8/L5o63tH2jaorDYKO9KN49+9LcPOx5PGzlWwlKrKe/U35qTervZ/qNM2/jixFaeJrSrVqjnUm7ybepxvdTyMEmtMwln+5oJPIxd+iMrXLbVEGBDNLPgMkBLdQX4AbGFuoaKRoCZaFACJYW6mXkQCWDXAoAmhV5gAM+pPiVgCAvAgVbdRYJFe7biUQAEAC7GrAXYACAuCBQo80MuQD1CTZV5FurgY28hmW92AFhYXKmuQEasQyuuQy5BGPAGatyJblkFYAzsLAYhalsLAS+YuVLmS2YC5b5EsVLmELojbLuhoKgRUhYIlwWxLBSxH5mViWAhULFt1Ag1LbqEgiAtkN3qBAi25iwEsy2fNC3UWYVOILZiwEsLF9SpAYhIyyGQEsT0MvgS+YC3NDIXLcBlyJnyLez0Lv2egEs+X5E3WZb/AEG9fgNDFRbFmuRk30Je/ACWFkUgCwtkLMJAFYuRBZcwi2CJbqx6hVuiZBJ8C+YCyACKFhZFBESxQNQA48RwCKpfMLNiyuUCNdQkXLQsWrjQ9x7C60cN7RcLXau4UKzjlo9x/S59c9p2339ncp1MlHI8V/heo4Op2o2ysTCLnLZu5Bv7qdSO98kaXtn2lCnUez6Nbes3C987I8PJj7cr7PjZ/wAXjWvQ+zHZMa/9ecU3J78pPi3mfWNl4aUKzhSe7eJ8/wDY5XpV+x+ExMHeTTpz6Sjk/lf1PomyMSljLNaxZ6+ef9vTx+Jlf5ZXkvaqp0dkKlvN7ubPnnsR2zWodrdobPu/+90t+F3bxQf6SfwPpXtSg62Cm8lkfKfZNsupiPaFCdGtGEsNCpWaabc423Wl6Sv6Hh4cfbGx9Lys7hyY19U7W1ar2U4NuLd21fifG9q01GtHeWd3n6n2ntLT3sPKL4q58b7SXpY9Lg27Ivi9ZaY/5Ge2Er0fYuknVg7dSe0qdTYsobRo0d/C1Ld4oZOD4v5fEz7Fz8UWj0nazZsdq9nMRh5RvaDlpwtn+Vz6OWEynb4/Hllj3HzPA9oa2LoQlTpd5QqeFptO645HgdsUKeH2viaFBTjShUahGeqXIzoVMXsjHVqMZZ05yhKL0bWVzPaO0au0FTdelRjOGW/GNpSXV8Tjjx+t6dOTl/kx7+uvs0FpnYztnkYvM6vOL4i6vbQIuVtAI+ZEuSMlZaK6MlNJWSDLj+pklnoZasNZkWJ0sZXtFJNp71/gv3McyyyjB+b+RdK9DsfaqrKOHxEkqiVoyf3/ANztsudjw2WVs2ej2ZtSL7nD4iVpTj4ZvRvSzOOeH7HbDP8AK7ZXDitcrHJumW5ZZHJ3kaso31MqFWdGVr3i/wAjmdO7MJRs7MGm/Rr5Jp3Ru0cRdJN3OipydOXRm3SrX0+ZmxqZO7hVuZp73FXOsp1ZcDmp13oyaa22Zya426HDKq089Cue8stTglqTSs3WXUzhXd1nka7jbMx3rcRpXb4XFJZP4GxWrKUd2+p0cKtsjap1W7XdzFx01M2ntbDKom7L4Hka0Z7NxjnH/Rm/EuT5nuayU4vyOh2vhFUhJNXyNY1jPtcHiYyimpXOxpVWrW0PG4KtUwWJ+z1G91+4/oehw1e6Tvl5mrNMy7d1Qr3ytZ8zdpV8zpaVbqbVGo3oSx1mWneUq7yu7m7Trq2TfQ6GnVd1mbtKr1Odjtjm7iNVW1JOat71jr6dbLN5mVSteKsyab2wxVRb7V8jq8ak7m9Ve+m75o08R4vQ3i4ZujnPu69nlGXHqbs4xlh99J/03b/penwfzNHa8FuStlfRl7PY14uh3dW0Z27qf0fyZ7OO7j53NNVuzm3RVrXj4Xbk819RlKjGab3oPcfzX1RKbbUqclaT8DT4SWn5jDNycoNWdRWXnw/P5m3Fyyjv0073cfDl+RyUpblaNVpPezsuPBr+czhpSd3G/vL8+Bz0FvU5Rbuo+KN+XH6EVjVi6OIcVnBPK+d0/wBi4eXc13vfcy81/wAHNWip0YzteVPJ+XB/T4GLpd4lUT8ULKS6PR/T4FGNWrPD1rxd4vX+5P8AY5cHjO4rONS0o8bcY/8ABw4mLlh7t50/C+q4fodRtTa+GwdCKk96usowXFcBo3p32P2rSwMair1EqbVrrjxTR4ram1K+0qqTbjTb92+vVnXYzG4jGVFVxVS9laEOS4GVCLysnvT/ACQZtcuIpU5YSTaVkvCdNVaWH6d5l8P+Dvq8ksPPPJRsjz+LklJQ/Dq+rLKlnbiUomDs2LcS2yCp0F+WYsVLmFTUWsZ2iRxQGO8gZWjzQCbcfKwZdOGQuuQGIuZO3ImXIKgMrIZcgJdonQyIBPQFshYCAvoMgiIJFFgFgWwtbgBiwZWAGNuo+JQAAAUsR5Mot1AmVs0L24GVupLMBfyAAD1A9RYIC3UO3IacAKTMFyCnqAs9A7AELDJFAEKAICjIIhRlyGQEv0GfEo9QqZj0HqWw0J6ADiNALj0KrcS6GIM/BxRbQ4E0jjMlFvV2MslwRLoaVyKjTcbuuk/IkqUVpWTMLkv0LpF7t80FTfNGN0W66jSsu6fMd0+ZjvWyzLvvmBe7fMjpvmVTY32Bju9SqN+JN4X8xpGW4uZe7j+IwuLjQy7uP4gqcfxGN+gu+A0M+7jb3jB088pC7GdxpU3OosVNjed87E0I0xmi7z5IXvwGkRNlzsTyKmwJmW1xcAS1gi3zDuVRvohfoAupRMhkV9ATQitw0KPmCBoS+QzLfKxYidBnpcoyJpS3xBcuCBdCLQfEystOAayyAxztmEVoICWKlmUAey9kW3KOw+2NOeKqKnhsXRnhqtSTsob1nFt8t5L4nQdpatSvt/HyqVu+tiJqM97eTSk7WOtv6oyXQz6T223/AC319X13/DttG/8AmWxKkvEnHFUlfh7s/wD6n2GG9Qmqtr2PzP7MdrrYvbnZmLqS3aM6vcVn/ZPwv4Np+h+nsXN06cpwjeUc0i8neFjr42XrnK8z22xH2jCNcWrHyHYFWth+1O9QqzpVIzdpQk00fV+1uKjXw0o91KnNq7UlZnyLY6b7azhFO29dfA8XifbH0/8Akv8AGWPtGMlXxeCp4ltODjaVuZ8r7c0JUsZTm199o+n4bCbQr4SEcHB1dxb043tl0PEduacqkKkqtLu503nFqzTT5Ek9OU5Mpy+O5OxEXJRaR9HwdKLhaSumrNHhOxEY91B2zPeYeTSWXwPpfj4+L89e1rZP+VdrKqUVGFaKlG3NZP5J+p5B3PuHts2PHFUcPj1BSlG8c1l4lu/PcfofD4PJJq3CxlizQot65GSik0W65k3uhAaXAm6uYuuCbJd8ii2XMllzJnzCTAvkS5crEyuAb4ll/p05dZL5GPGxy7reEv8Agqr81+xErjyuZVvFhou1nGTXxI7HLTXeUKsEtFvL0BXb9nNtb27gsZLPSnUb16P9T08EtLHzOSs2em7M7c8UMHjZ24U6jf5M4ZY/6eji5PyvUOKtocMob0rs20r8SuCOT0aaMqa45HFvOmzbrbqy4HV7RxlDDq9WpFZZLiWTbN6dlRrJq6dznhO7seJlt+cMSpUqbdJPxKWsv0PTbNxtHF0VWoz3ovnqnyYywsTHOZdO1hKz0M4yNVTd83kcimjNdHNLdayOKSzLGbfAyi1bNBXEk7nLCVueRbReViqK4OxBsQacdTXxVNSysjnhZKy0E91p3uYXTyW3MCpptZNZprgzW2Ti5NujUynF2aPR7RpRnF5HlNp0J0K32iks17yXFHSfNMZddx6OjPSxt0alrHQ7MxkasE073O1pzyWZG5Xa0pp2aZtU6ljqKdRq2eRtwrXRLGnZ06qejM+8z5GhGsrGcaudmYsb9mzKfwOGpO8lxRhKplZcTjcyyJWhtWKkmeXwuK+wbehvWjRrJRkvr8T1OPkmnc8ntinOUb08rPW2iZ6uD7p4vIn69tiod6lXWSmru34lr8cmYVYrejUjlvLeXR8fzOr7LY2VbB/Za8lKrF+F31tp8VdHfwgpUpxXDxQ+q+Gfodb1XmnbSxNTdqKcMt7xrp/GbOGqQhXVS29CXit0eq+aE8OquHmla8PEuq4/qYQhbD62dJ3XVP8Af5lV2CVOnUafii8pc3H+WYUI4bEtyzja0nzi+XpmdTjtrYbA4WM8RWSkm4OPGS1X6Hl9qdoMZtKKpQ/oUIJxy1kr6NjSW6dxt7bkMLUrYfCShVk04TnrFcn1Z4+tVnOq6jblOTvvPVnJuOcbq0YLi+f6kUX7tNN9eP7Bi3bOlC8VOpnJcP1Nqle7k34pfkuZw4SKUpQb3na6WtmbCTUnfO2cur5BYm0K0aWBbazdrL6HnpNyd29dTe2zW36ypJ3UM31ZoWIuhFuR9QiqyyazMoxi+pgiqVgiyiovW4tw4E3uNib13xBIZAt10Bdrpivd9CPUAyiP3blhqAUJ6h8AAMH73qWTe8AFI6Iv3mARUY4IAqK9EV8QAhxM3oABJGM+AAUkRe6wAC1XmR8AAORpbuhGAEYoMAKjI+PmABlEj1j5gBKyehOIBQeqH30ARVlqSWoACXDyMYt3eYAKy+8jJagFqo9SP6gEB6gAsQXvDigAHAPh5gAH7xeABSq/eMZagEB6kqZaAA/VenqXiAUZy1RGlyAA45aIs8o5AAXl5kWiAIiPRmXBgBWM9CgBDgVaAFisklb1ZZagAJakYBFTiQAqDJxAFKy+8/MjACD1YevqAQQoAGUPcZACjFcSsACMvEAiqHqAAZWAEP1HEAKr4+YWoAFIAAehOC8wCDKeUlbmT7yAKjkWWfFafkfr+g3LBUXLNulFu/HIAflb4vsaPtEhB7LwcnGLe5a9uG6j4tsWMf8At4/Cve5dADw+N/nX1/O/8Ufc+yDcZ1d3L+nw8z5/7Ukv8yx75xTfwQBrl/8AK58P/hrHsN/+LTfGyPc4YA98fNn1572opPsjibpO0G1+R+cMYksdiEkku+n82AYv1nJwriV+76gBlY6mdlvacUAFY2W8yPT1AKQQSVwAI+Bz0M8Fir/2fMAlSuJpWZs7MS76asv9OXyAEL8ddUS3mSmlZZAHOtR9D7PyctkUJSbk93Vs7F+6wDz369+Px1O0W1CVm0eJxviqSlLN31YB043Hma1lfQ7jsk2tpOKbUXF3XBgG8vjjxf5Pa00uS1ORJclwAPPXtZxS5Iq1SAFIzilfRHJFLktQCK5opW0RGldZIAy01cZGOfhXwOj2lGLt4VpyANRjJ0WyElUmkrLeZ6LDpWQBq/WcPjcpaepzU0skAStueCXI5I8QDNbitK2iMIpX0QAg1calu6I6WpCDhWvCLy4oA78P2PF5BsWMY4yLjFJ73BdUe1waXeUMl736gHoy+vPh8TCJfaqasrNtNejNWaSpOy1pSv8AAAy0+d7S/qbUqOfid7Z5inGPcw8K1fAAMZOaslv01ZW3VkcjjFYRtRS8XIAfqOPAxSxlOyWvI3LLkvff0ALkYPNYj/8AIq/738zieoBI0ysroxlqAEHp6E4sARVevqFqAFUAFZf/2Q==";
  const handleBannerUpload=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    setBannerLoading(true);setBannerProg(0);
    try{
      const url=await uploadFile(file,"image",setBannerProg);
      setBannerImg(url);
      localStorage.setItem("lod_banner_img",url);
      await saveToSheet("AI배너_이미지",url);
    }catch(err){}
    finally{setBannerLoading(false);e.target.value="";}
  };
  const handleWheel=(e)=>{
    if(!IS_ADMIN)return;
    e.preventDefault();
    setBannerScale(prev=>Math.min(Math.max(prev-(e.deltaY*0.001),1),3));
  };
  const handleMouseDown=(e)=>{
    if(!IS_ADMIN)return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({x:e.clientX-bannerPos.x,y:e.clientY-bannerPos.y});
  };
  const handleMouseMove=(e)=>{
    if(!isDragging||!IS_ADMIN)return;
    setBannerPos({x:e.clientX-dragStart.x,y:e.clientY-dragStart.y});
  };
  const handleMouseUp=()=>setIsDragging(false);
  const saveBannerSettings=async()=>{
    localStorage.setItem("lod_banner_pos",JSON.stringify(bannerPos));
    localStorage.setItem("lod_banner_scale",String(bannerScale));
    await saveToSheet("AI배너_설정",JSON.stringify({...bannerPos,scale:bannerScale}));
    alert("✅ 저장됐습니다!");
  };
  const imgSrc=bannerImg||DEFAULT_IMG;

  return(
    <div style={{padding:"48px 20px",position:"relative",zIndex:1,boxSizing:"border-box"}}>

      {/* ===== 모바일 전용 배너 ===== */}
      <div className="ai-banner-mobile" style={{display:"none",background:"#0a0a0a",border:"1px solid rgba(204,255,0,.3)",borderRadius:20,padding:"36px 24px",animation:"limeGlow 2.5s ease-in-out infinite",marginBottom:0}}>
        <div style={{fontSize:16,letterSpacing:".4em",color:"rgba(204,255,0,.9)",fontWeight:700,textTransform:"uppercase",marginBottom:20,textAlign:"center"}}>L O D · AI FASHION</div>
        <p style={{fontSize:"clamp(24px,6.5vw,32px)",fontWeight:900,color:"#f0ece4",lineHeight:1.3,marginBottom:18,textAlign:"center",wordBreak:"keep-all"}}>실제 모델 없이 당신의 의상을 완성합니다</p>
        <p style={{fontSize:20,color:"rgba(240,236,228,.95)",lineHeight:2,marginBottom:28,textAlign:"center",wordBreak:"keep-all"}}>AI 기술로 제작된 패션 모델로<br/>비용 걱정 없이 완성도 높은<br/>상품 이미지를 만들어 드립니다.</p>
        <div style={{display:"flex",flexDirection:"column",gap:12,alignItems:"center"}}>
          <a href={tiktokBannerLink||"https://www.tiktok.com/@glggid"} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,background:"#fff",color:"#0a0a0a",padding:"16px 0",borderRadius:50,fontSize:16,fontWeight:900,textDecoration:"none",width:"100%",boxSizing:"border-box",animation:"whiteGlow 2.5s ease-in-out infinite"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
            틱톡에서 확인하기 ▶
          </a>
          <a href="https://lod-model.vercel.app" target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",justifyContent:"center",background:"#CCFF00",color:"#0a0a0a",padding:"16px 0",borderRadius:50,fontSize:16,fontWeight:900,textDecoration:"none",width:"100%",boxSizing:"border-box"}}>
            AI 사이트 바로가기 ▶
          </a>
          <a href={aiInquiryLink||DEFAULTS["AI 문의 링크"]} target="_blank" rel="noopener noreferrer"
            style={{display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",border:"2px solid #CCFF00",color:"#CCFF00",padding:"16px 0",borderRadius:50,fontSize:16,fontWeight:900,textDecoration:"none",width:"100%",boxSizing:"border-box"}}>
            AI 모델 제작 문의하기 ▶
          </a>
        </div>
      </div>

      {/* ===== PC 전용 배너 ===== */}
      <div className="ai-banner-pc">
        {IS_ADMIN&&(
          <div style={{display:"flex",gap:8,marginBottom:10,justifyContent:"flex-end",alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:"rgba(240,236,228,.4)"}}>🖱️ 드래그=위치이동 | 휠=크기조절</span>
            <button onClick={()=>bannerFileRef.current?.click()}
              style={{background:"#CCFF00",color:"#0a0a0a",border:"none",borderRadius:20,padding:"8px 18px",fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"inherit"}}>
              📷 배경사진 교체
            </button>
            <button onClick={saveBannerSettings}
              style={{background:"rgba(240,236,228,.1)",color:"#f0ece4",border:"1px solid rgba(240,236,228,.3)",borderRadius:20,padding:"8px 18px",fontSize:12,fontWeight:900,cursor:"pointer",fontFamily:"inherit"}}>
              ✅ 위치/크기 저장
            </button>
            <input ref={bannerFileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleBannerUpload}/>
          </div>
        )}
        <div
          style={{position:"relative",borderRadius:20,overflow:"hidden",border:"1px solid rgba(204,255,0,.3)",animation:"limeGlow 2.5s ease-in-out infinite",aspectRatio:"1365/512",minHeight:"280px",cursor:IS_ADMIN?(isDragging?"grabbing":"grab"):"default"}}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img src={imgSrc} alt="AI 모델"
            style={{
              position:"absolute",
              top:0,left:0,
              width:`${bannerScale*100}%`,
              height:`${bannerScale*100}%`,
              objectFit:"contain",
              objectPosition:"right center",
              transform:`translate(${bannerPos.x}px,${bannerPos.y}px)`,
              transformOrigin:"top left",
              userSelect:"none",
              pointerEvents:"none"
            }}/>
          {bannerLoading&&(
            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.7)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,zIndex:10}}>
              <div style={{fontSize:13,color:"#f0ece4",fontWeight:700}}>업로드 중 {bannerProg}%</div>
              <div style={{width:"60%",height:6,background:"rgba(255,255,255,.2)",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",background:"#CCFF00",borderRadius:3,width:`${bannerProg}%`,transition:"width .25s"}}/>
              </div>
            </div>
          )}
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to right,rgba(0,0,0,0.4) 0%,rgba(0,0,0,0.15) 45%,transparent 60%)"}}/>
          <div className="ai-banner-text" style={{justifyContent:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:20,letterSpacing:".5em",color:"rgba(204,255,0,.9)",textTransform:"uppercase",fontWeight:900}}>L O D · AI FASHION</div>
            </div>
            <p className="ai-banner-headline">실제 모델 없이<br/>당신의 의상을 완성합니다</p>
            <div>
              <p className="ai-banner-desc">AI 기술로 제작된 패션 모델로 비용 걱정 없이 완성도 높은<br/>상품 이미지를 만들어 드립니다.</p>
              <div style={{display:"flex",gap:10,flexWrap:"nowrap",alignItems:"center"}}>
                <a href={tiktokBannerLink||"https://www.tiktok.com/@glggid"} target="_blank" rel="noopener noreferrer"
                  style={{display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:"#fff",color:"#0a0a0a",padding:"12px 18px",borderRadius:50,fontSize:14,fontWeight:900,textDecoration:"none",whiteSpace:"nowrap",animation:"whiteGlow 2.5s ease-in-out infinite"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity=".85"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a0a0a"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>
                  틱톡에서 확인하기 ▶
                </a>
                <a href="https://lod-model.vercel.app" target="_blank" rel="noopener noreferrer"
                  style={{display:"flex",alignItems:"center",justifyContent:"center",background:"#CCFF00",color:"#0a0a0a",padding:"12px 18px",borderRadius:50,fontSize:14,fontWeight:900,textDecoration:"none",whiteSpace:"nowrap"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity=".85"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  AI 사이트 바로가기 ▶
                </a>
                <a href={aiInquiryLink||DEFAULTS["AI 문의 링크"]} target="_blank" rel="noopener noreferrer"
                  style={{display:"flex",alignItems:"center",justifyContent:"center",background:"transparent",border:"2px solid #CCFF00",color:"#CCFF00",padding:"12px 18px",borderRadius:50,fontSize:14,fontWeight:900,textDecoration:"none",whiteSpace:"nowrap"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  AI 모델 제작 문의하기 ▶
                </a></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


function FaqPage({onBack,IS_ADMIN,data,onUpdate}){
  const defaultFaqs=[
    {q:"동대문 새벽시장 처음 가려는데 준비물이 뭐가 있나요?",a:"앞으로 맬 수 있는 가방이 필요합니다. 동대문 새벽시장은 상가 안에 들어가면 사람도 많고 많이 부딪히기 때문에 폰이나 현금, 지갑을 작은 가방에 넣어서 앞으로 매고 다니셔야 안전합니다. 가끔 소매치기가 있습니다."},
    {q:"사입할 때 사업자등록증 실물을 꼭 들고 가야 하나요?",a:"아니요. 도매 매장에서 의상을 구매할 때 상호를 물어봅니다. 그때 운영 중인 쇼핑몰 상호나 옷가게(로드샵) 상호를 알려주시면 됩니다."},
    {q:"사업자등록 전인데 도매가로 사입할 수 있는 방법이 있나요?",a:"도매 매장에 직접 가셔서 사업자 등록 전인데 샘플이 필요해서 구매하려 한다고 말씀하셔도 되고, 솔직하게 말씀하셔서 구매하셔도 됩니다. 예전보다 소매 분들에게 판매하는 경우가 늘어나고 있어 웬만하면 구매하실 수 있습니다."},
    {q:"초보 사입자는 현금을 보통 얼마 정도 챙겨가야 적당한가요?",a:"요즘은 신상마켓을 참고해서 구매할 품목 리스트를 만들어 예상 금액이 나오는 경우가 있는데, 사진과 실물 의상이 다르기 때문에 리스트와 다르게 구매하는 경우가 많습니다. 예상 금액보다 100,000원 정도 더 가져오시는 게 좋습니다."},
    {q:"동대문 도매시장에서 카드 결제나 계좌이체도 받아주나요?",a:"아직까지 카드는 안 되지만 계좌이체는 가능합니다. 다만 계좌이체 시 부가세도 함께 입금하라고 할 수 있습니다. 현금을 챙겨 가시는 게 편하십니다."},
    {q:"계좌이체 하면 부가세 10%를 무조건 더 내야 하나요?",a:"언제부터인가 부가세 포함해서 입금하라는 곳들이 점점 늘어나고 있습니다. 아직까지는 동대문 새벽시장에서는 현금으로 하시는 것을 추천드립니다."},
    {q:"새벽시장에 입고 갈 만한 편한 옷이나 신발 추천해 주세요.",a:"많이 걷고 사람들과 많이 부딪히기 때문에 편한 복장으로 하시고, 신발은 많이 걸어도 발이 아프지 않은 운동화를 추천드립니다. 가끔 차려입고 오시는 분들이 있는데 그럴수록 초보로 인식되는 경우가 많습니다. 도매 매장 분들도 쇼핑몰이나 옷가게 하시는 분들을 많이 상대하니 활동하기 편한 복장으로 하시는 게 낫습니다."},
    {q:"사입 가방(대봉)은 어디서 구할 수 있나요?",a:"많이 구매한 도매 매장에 대봉을 얻을 수 있냐고 하면 그냥 줍니다. 그 대봉 안에 구매한 의상 봉투를 넣어서 상가 안에서 한쪽을 잡고 끌고 다니시거나, 도매 매장에 대봉을 맡기는 것을 추천드립니다."},
    {q:"동대문 밤시장과 낮시장의 가장 큰 차이점이 무엇인가요?",a:"저녁 8시에 오픈하는 상가를 밤시장이라고 합니다. (APM, 럭스, 누존, DDP, 제일평화 등) 밤 12시에 오픈하는 상가를 낮시장이라고 합니다. (디오트, 청평화, 동평화, 테크노 등) 신발 상가는 따로 신발 상가라고 합니다."},
    {q:"새벽시장은 몇 시부터 몇 시까지가 가장 활발한가요?",a:"밤 10시부터 새벽 3시까지 밤시장, 낮시장 전체적으로 사람이 가장 많은 시간입니다."},
    {q:"도매 상가별로 타깃 연령대나 스타일이 어떻게 나뉘나요?",a:"APM, 럭스, 디오트, 테크노 → 20~30대\n누존, 청평화(4~5층) → 20대 중후반~30대\n제일평화, 벨포스트, 유어스, 청평화 → 30~40대\n나머지 상가 → 40대 이상"},
    {q:"디오트, 청평화, APM 계열 상가들의 특징이 궁금합니다.",a:"APM 계열 → 디자인과 세련미, 원단이 좋습니다. 가격대가 있는 편입니다.\n디오트 → APM보다 디자인과 원단이 다소 떨어지지만 가격이 저렴합니다.\n청평화(4~5층) → 디오트보다 디자인이 좀 더 성숙한 편이고 원단은 비슷합니다."},
    {q:"주말이나 공휴일에도 새벽시장이 열리나요?",a:"5일제로 운영됩니다. 공휴일이 평일인 경우 디오트, 청평화만 조기 폐점(오전 5~6시)하고 나머지 상가들은 정상 영업합니다."},
    {q:"명절이나 여름 휴가 기간에는 도매시장이 언제 쉬나요?",a:"공지를 한 달 전에 상가마다 출입문에 붙여 놓습니다. 평균 일주일 정도 쉬며 매해 날짜는 다릅니다."},
    {q:"동대문 새벽시장 갈 때 주차 팁이 있나요?",a:"성동공고 지하 주차장이 가장 저렴합니다. 불법주차를 많이 하시는데 카메라 단속이 전보다 많아졌으며 카메라를 달고 다니는 차량도 자주 다닙니다. 안전한 곳은 이미 사입삼촌들이 주차를 했으니 성동공고 주차장을 이용하시는 것을 추천드립니다."},
    {q:"사입할 아이템 리스트는 어떤 형식으로 정리해 가는 게 좋나요?",a:"대부분 신상마켓을 보고 리스트를 만드시는 경우가 많은데, 사진과 실물 의상의 느낌이 많이 다르기 때문에 의상의 예상 금액을 먼저 보시고 그 금액에 맞는 상가 안에서 직접 의상을 보시면서 구매하시는 것을 추천드립니다."},
    {q:"지방에서 첫 사입 올라가는데 교통편 추천해 주세요.",a:"각 지방에 따라 관광버스가 있습니다. 서울에 오는 날짜가 다 다르기 때문에 해당 지역 담당 삼촌에게 문의하시는 것을 추천드립니다."},
    {q:"온라인 쇼핑몰 하려면 밤시장이 좋나요, 낮시장이 좋나요?",a:"하시려는 의상과 가격대에 따라 나뉩니다. 밤시장 쪽이 낮시장보다 금액이 더 비싼 편입니다."},
    {q:"도매 단가 시세를 미리 파악할 수 있는 사이트나 앱이 있나요?",a:"현재 신상마켓에서 많은 정보를 얻을 수 있습니다."},
    {q:"첫 방문 때 시장조사만 하고 물건 안 사도 눈치 안 주나요?",a:"저녁에 가시면 눈치가 보일 수 있습니다. 도매 매장에서는 공장에서 오는 물건도 받아야 하고, 주문 확인, 포장, 구매 고객 상대, 사입삼촌 픽업 응대 등 할 일이 많아서 시장조사만 하시는 분들을 반기지는 않습니다."},
    {q:"동대문 갈 때 차량을 가지고 가면 편한 동선이 있나요?",a:"동대문 새벽시장 안에 차들이 복잡하게 다니기 때문에 물건을 들고 가서 차에 싣는 것이 낫습니다. 또한 잠시 두고 차를 가지고 오는 사이에 분실될 수도 있으니 주의하세요."},
    {q:"새벽시장은 비가 오거나 눈이 와도 정상 영업하나요?",a:"네, 태풍이 와도 영업합니다."},
    {q:"사입할 때 유용한 앱이 있다면 추천해 주세요.",a:"편하고 빠르게 사용할 수 있는 것을 추천드립니다. 한가한 상가도 있지만 복잡한 상가에서는 천천히 적거나 입력하기 어렵습니다."},
    {q:"도매 매장 호수 찾는 법이 헷갈리는데 설명해 주세요.",a:"각 상가마다 보는 방식이 다르지만 요즘은 단순하게 표기하는 경우가 많아서 호수 찾기는 편하실 겁니다."},
    {q:"1인 창업자인데 혼자 새벽시장 가면 많이 힘든가요?",a:"혼자 다니시는 분들이 많습니다. 같이 오면 오히려 의견 차이가 생기는 경우도 있습니다."},
    {q:"도매 삼촌들이나 이모들이 초보인 거 알아보면 무시하나요?",a:"티가 날 수밖에 없고, 무시보다는 귀찮아하는 경우가 많습니다. 시장 용어를 모르시거나 구매 과정이 느리면 도매 상인분들이 답답해하는 경우가 있습니다."},
    {q:"사입 전에 동대문 의류 용어를 다 외우고 가야 할까요?",a:"기본적인 용어만 아시면 됩니다.\n• 깔품 → 재고 확인\n• 미송 → 아직 출고 안 된 상품\n• 품절 → 해당 상품 없음\n• 전체품절 → 모든 사이즈/컬러 품절\n• 월밤 → 월요일 밤 (출고 예정일)\n예) '미송 잡으시면 다음 주 월밤에 됩니다' → 예약하시면 다음 주 월요일 밤에 출고 예정입니다. (날짜는 변동될 수 있습니다.)"},
    {q:"20대 여성 쇼핑몰 하려는데 첫 사입 상가로 어디가 무난한가요?",a:"대부분 디오트에서 많이 시작하십니다."},
    {q:"남성복 사입은 주로 어느 상가로 가야 물건이 많나요?",a:"누존, 벨포스트, 남평화, APM을 추천드립니다. 각 상가별로 분위기가 다르며 매장마다도 다르니 4곳 다 확인해보시는 것을 추천드립니다."},
    {q:"도매 텍(라벨)과 자체 제작 라벨의 차이가 무엇인가요?",a:"각각의 브랜드 표시라고 생각하시면 됩니다. 라벨 교체는 법적으로 문제가 될 수 있으니 주의하세요."},
    {q:"도매 매장에 들어가서 첫마디를 어떻게 시작해야 하나요?",a:"'안녕하세요~ 이거 얼마예요? 컬러는요? 원사이즈인가요?' 이 정도면 충분합니다."},
    {q:"'어디서 오셨어요?'라고 물어보면 뭐라고 답해야 하나요?",a:"현재 운영 중인 상호를 말씀하시면 됩니다."},
  ];

  const faqs=data["faq_list"]?JSON.parse(data["faq_list"]):defaultFaqs;
  const [openIdx,setOpenIdx]=useState(null);
  const [search,setSearch]=useState("");
  const [editing,setEditing]=useState(null);
  const [editVal,setEditVal]=useState("");

  const filtered=faqs.filter(f=>
    f.q.toLowerCase().includes(search.toLowerCase())||
    f.a.toLowerCase().includes(search.toLowerCase())
  );

  const toggle=(i)=>setOpenIdx(prev=>prev===i?null:i);

  return(
    <div style={{minHeight:"100vh",paddingBottom:80}}>
      <div style={{maxWidth:896,margin:"0 auto",padding:"16px 20px 0"}}>
        <button onClick={onBack}
          style={{background:"#CCFF00",border:"none",borderRadius:14,padding:"12px 24px",color:"#0a0a0a",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 0 20px rgba(204,255,0,.4)"}}>
          ← 메인
        </button>
      </div>

      <div style={{textAlign:"center",padding:"48px 20px 32px"}}>
        <div style={{fontSize:12,letterSpacing:".4em",color:"rgba(204,255,0,.6)",marginBottom:16,textTransform:"uppercase"}}>LOD · FAQ</div>
        <h1 style={{fontSize:"clamp(28px,5vw,52px)",fontWeight:900,color:"#f0ece4",lineHeight:1.2,marginBottom:16,textShadow:"0 0 20px rgba(204,255,0,.3)"}}>자주 묻는 질문</h1>
        <p style={{fontSize:"clamp(16px,2vw,20px)",color:"#CCFF00",fontWeight:700,animation:"textGlow 2.5s ease-in-out infinite"}}>궁금한 점을 빠르게 찾아보세요</p>
      </div>

      {/* 검색창 */}
      <div style={{padding:"0 20px",maxWidth:700,margin:"0 auto 32px"}}>
        <div style={{position:"relative"}}>
          <span style={{position:"absolute",left:18,top:"50%",transform:"translateY(-50%)",fontSize:18,color:"rgba(204,255,0,.6)"}}>🔍</span>
          <input
            type="text"
            placeholder="질문을 검색하세요..."
            value={search}
            onChange={e=>{setSearch(e.target.value);setOpenIdx(null);}}
            style={{width:"100%",background:"rgba(204,255,0,.05)",border:"1.5px solid rgba(204,255,0,.3)",borderRadius:50,padding:"16px 20px 16px 52px",color:"#f0ece4",fontSize:16,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color .2s"}}
            onFocus={e=>e.target.style.borderColor="rgba(204,255,0,.8)"}
            onBlur={e=>e.target.style.borderColor="rgba(204,255,0,.3)"}
          />
          {search&&(
            <button onClick={()=>{setSearch("");setOpenIdx(null);}}
              style={{position:"absolute",right:18,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(240,236,228,.5)",fontSize:20,cursor:"pointer"}}>✕</button>
          )}
        </div>
        {search&&(
          <div style={{fontSize:13,color:"rgba(240,236,228,.4)",marginTop:8,textAlign:"center"}}>
            {filtered.length > 0 ? `${filtered.length}개의 질문이 검색됐습니다` : "해당 질문이 없습니다"}
          </div>
        )}
      </div>

      {/* FAQ 목록 */}
      <div style={{padding:"0 20px",maxWidth:896,margin:"0 auto",display:"flex",flexDirection:"column",gap:8}}>
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"60px 20px",color:"rgba(240,236,228,.4)",fontSize:16}}>
            해당 질문이 없습니다 😔
          </div>
        ):(
          filtered.map((faq,i)=>(
            <div key={i}>
              {/* 질문 바 */}
              <div
                onClick={()=>toggle(i)}
                className={openIdx!==i?"shimmer-border":""}
                style={{
                  background:openIdx===i?"rgba(204,255,0,.1)":"rgba(204,255,0,.03)",
                  border:`1.5px solid ${openIdx===i?"rgba(204,255,0,.7)":"rgba(204,255,0,.2)"}`,
                  borderRadius:openIdx===i?"16px 16px 0 0":"16px",
                  padding:"18px 24px",cursor:"pointer",
                  transition:"all .2s",
                  boxShadow:openIdx===i?"0 0 16px rgba(204,255,0,.12)":"none"
                }}
                onMouseEnter={e=>{if(openIdx!==i)e.currentTarget.style.background="rgba(204,255,0,.07)";}}
                onMouseLeave={e=>{if(openIdx!==i)e.currentTarget.style.background="rgba(204,255,0,.03)";}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:"clamp(14px,1.6vw,16px)",fontWeight:700,color:openIdx===i?"#CCFF00":"#f0ece4",flex:1,textAlign:"left",lineHeight:1.5,whiteSpace:"pre-line",cursor:IS_ADMIN?"pointer":"default"}}
                    onClick={e=>{if(IS_ADMIN){e.stopPropagation();setEditing({type:"q",idx:i,label:"질문"});setEditVal(faq.q);}}}>
                    {faq.q}
                  </span>
                  <span style={{fontSize:13,color:"#CCFF00",transform:openIdx===i?"rotate(180deg)":"rotate(0deg)",transition:"transform .25s",flexShrink:0}}>▼</span>
                </div>
              </div>

              {/* 답변 */}
              {openIdx===i&&(
                <div className="shimmer-border" style={{background:"rgba(204,255,0,.04)",border:"1.5px solid rgba(204,255,0,.4)",borderTop:"none",borderRadius:"0 0 16px 16px",padding:"20px 24px",animation:"fadeIn .2s ease"}}>
                  <div style={{fontSize:"clamp(14px,1.5vw,15px)",color:"rgba(240,236,228,.8)",lineHeight:1.9,textAlign:"left",whiteSpace:"pre-line",cursor:IS_ADMIN?"pointer":"default"}}
                    onClick={()=>{if(IS_ADMIN){setEditing({type:"a",idx:i,label:"답변"});setEditVal(faq.a);}}}>
                    {faq.a}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div style={{padding:"48px 20px 0",maxWidth:896,margin:"0 auto"}}>
        <button onClick={onBack}
          style={{width:"100%",background:"rgba(204,255,0,.08)",border:"1px solid rgba(204,255,0,.3)",borderRadius:16,padding:"20px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}>
          🏠 메인으로 돌아가기
        </button>
      </div>

      {/* 관리자 편집 모달 */}
      {editing&&IS_ADMIN&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#1a1a1a",borderRadius:20,padding:32,width:"100%",maxWidth:600,border:"1px solid rgba(204,255,0,.3)"}}>
            <div style={{fontSize:14,color:"#CCFF00",marginBottom:12,fontWeight:700}}>✏️ {editing.label} 수정</div>
            <textarea value={editVal} onChange={e=>setEditVal(e.target.value)}
              style={{width:"100%",minHeight:200,background:"rgba(255,255,255,.05)",border:"1px solid rgba(204,255,0,.3)",borderRadius:12,padding:16,color:"#f0ece4",fontSize:15,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:12,marginTop:16}}>
              <button onClick={async()=>{
                const newFaqs=[...faqs];
                if(editing.type==="q") newFaqs[editing.idx]={...newFaqs[editing.idx],q:editVal};
                else newFaqs[editing.idx]={...newFaqs[editing.idx],a:editVal};
                await onUpdate("faq_list",JSON.stringify(newFaqs));
                setEditing(null);
              }} style={{flex:1,background:"#CCFF00",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#0a0a0a",cursor:"pointer"}}>저장</button>
              <button onClick={()=>setEditing(null)}
                style={{flex:1,background:"rgba(255,255,255,.1)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#f0ece4",cursor:"pointer"}}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WhyUnclePage({onBack,IS_ADMIN,data,onUpdate}){
  const sections=[
    {
      num:"01",
      key:"why_uncle_01",
      defaultTitle:"동대문 새벽시장, 직접 나가기 쉽지 않습니다",
      defaultText:"쇼핑몰과 옷가게(로드샵) 사장님들은 매일 직접 동대문 새벽시장을 돌아다니기 어렵습니다. 동대문 새벽시장은 상가와 매장 수가 많고 도매 매장이 빠르게 움직이며, 상품 확인도 매우 빠릅니다. 또한 사입삼촌들이 빠르게 움직이고 짐도 많이 들고 다니기 때문에 익숙하지 않은 사람에게는 움직임 자체가 매우 힘듭니다.\n\n동대문 새벽시장은 저녁 8시부터 운영되기 때문에 시장에 나올 시간에 개인 정비와 취침을 하시고 쇼핑몰과 옷가게(로드샵) 운영에 집중하시는 것이 훨씬 나으실 것 같습니다."
    },
    {
      num:"02",
      key:"why_uncle_02",
      defaultTitle:"비용 절감",
      defaultText:"직접 동대문에 나가게 되면 교통비, 주차비, 식사비는 물론 이동하는 시간까지 낭비됩니다. 사입삼촌을 이용하면 이런 불필요한 비용과 시간을 줄일 수 있어 오히려 경제적입니다."
    },
    {
      num:"03",
      key:"why_uncle_03",
      defaultTitle:"운영에 집중할 수 있는 시간 확보",
      defaultText:"동대문 새벽시장에 직접 나가는 시간을 사입삼촌에게 맡기면 그 시간을 훨씬 효율적으로 활용할 수 있습니다.\n\n• 쇼핑몰 및 SNS 마케팅에 집중\n• 고객 응대 및 주문 처리에 집중\n• 신규 상품 기획 및 매출 올리는 데 집중\n\n사입삼촌에게 현장을 맡기고 사장님은 비즈니스 성장에만 집중하세요."
    },
    {
      num:"04",
      key:"why_uncle_04",
      defaultTitle:"현장에서만 얻을 수 있는 살아있는 시장 정보",
      defaultText:"사입삼촌들은 현장에서 일하면서 서로 아는 삼촌들과 자연스럽게 대화를 나눕니다. 이 과정에서 어느 거래처가 최근 어떤 방식으로 홍보를 해서 주문량이 늘었는지, 요즘 트렌드가 어느 방향인지 등 현장에서만 얻을 수 있는 정보들이 오고 갑니다.\n\n실제로 틱톡 라이브가 쇼핑몰 매출에 영향을 미치기 시작할 초창기 때도 삼촌들은 이미 현장에서 먼저 알고 있었고, 친한 거래처에게 먼저 정보를 알려주는 경우가 많았습니다. 소문이 나기 전에 삼촌들이 먼저 알고 있는 경우가 많기 때문에 좋은 담당 삼촌을 두는 것이 비즈니스에 큰 도움이 됩니다."
    }
  ];

  const [openIdx,setOpenIdx]=useState(null);
  const [editing,setEditing]=useState(null);
  const [editVal,setEditVal]=useState("");

  const toggle=(i)=>setOpenIdx(prev=>prev===i?null:i);

  return(
    <div style={{minHeight:"100vh",paddingBottom:80}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 20px 0"}}>
        <button onClick={onBack}
          style={{background:"#CCFF00",border:"none",borderRadius:14,padding:"12px 24px",color:"#0a0a0a",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 0 20px rgba(204,255,0,.4)"}}>
          ← 메인
        </button>
      </div>

      <div style={{textAlign:"center",padding:"48px 20px 32px"}}>
        <div style={{fontSize:12,letterSpacing:".4em",color:"rgba(204,255,0,.6)",marginBottom:16,textTransform:"uppercase"}}>LOD · GUIDE</div>
        <h1 style={{fontSize:"clamp(28px,5vw,52px)",fontWeight:900,color:"#f0ece4",lineHeight:1.2,marginBottom:16,textShadow:"0 0 20px rgba(204,255,0,.3)"}}>사입삼촌이 필요한 이유</h1>
      </div>

      {/* 2단 그리드 + 아코디언 */}
      <div style={{padding:"0 20px",maxWidth:1100,margin:"0 auto"}}>
        <div className="why-grid" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
          {sections.map((s,i)=>{
            const title=data[s.key+"_title"]||s.defaultTitle;
            const text=data[s.key]||s.defaultText;
            const isOpen=openIdx===i;
            return(
              <React.Fragment key={s.num}>
                {/* 탭 버튼 */}
                <div
                  onClick={()=>toggle(i)}
                  className={!isOpen?"shimmer-border":""}
                  style={{
                    background:isOpen?"rgba(204,255,0,.12)":"rgba(204,255,0,.03)",
                    border:`1.5px solid ${isOpen?"rgba(204,255,0,.7)":"rgba(204,255,0,.2)"}`,
                    borderRadius:16,padding:"22px 24px",cursor:"pointer",
                    transition:"all .25s",position:"relative",overflow:"hidden",
                    boxShadow:isOpen?"0 0 20px rgba(204,255,0,.15)":"none"
                  }}
                  onMouseEnter={e=>{if(!isOpen)e.currentTarget.style.background="rgba(204,255,0,.07)";}}
                  onMouseLeave={e=>{if(!isOpen)e.currentTarget.style.background="rgba(204,255,0,.03)";}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:"clamp(15px,1.6vw,18px)",fontWeight:900,color:isOpen?"#CCFF00":"#f0ece4",lineHeight:1.4,flex:1,whiteSpace:"pre-line",cursor:IS_ADMIN?"pointer":"default"}}
                      onClick={e=>{if(IS_ADMIN){e.stopPropagation();setEditing({key:s.key+"_title",label:"제목"});setEditVal(title);}}}>
                      {title}
                    </span>
                    <span style={{fontSize:14,color:"#CCFF00",transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .25s",display:"inline-block",flexShrink:0}}>▼</span>
                  </div>
                  {isOpen&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"linear-gradient(to right,transparent,rgba(204,255,0,.5),transparent)"}}/>}
                </div>

                {/* 펼쳐지는 내용 */}
                {isOpen&&(i%2===1||(i===sections.length-1))&&(
                  <div className="shimmer-border" style={{gridColumn:"1/-1",background:"rgba(204,255,0,.04)",border:"1px solid rgba(204,255,0,.2)",borderRadius:16,padding:"28px 32px",animation:"fadeIn .2s ease"}}>
                    <div style={{fontSize:"clamp(14px,1.6vw,16px)",color:"rgba(240,236,228,.75)",lineHeight:1.9,whiteSpace:"pre-line",cursor:IS_ADMIN?"pointer":"default"}}
                      onClick={()=>{if(IS_ADMIN){setEditing({key:s.key,label:"내용"});setEditVal(text);}}}>
                      {text}
                    </div>
                  </div>
                )}
                {isOpen&&i%2===0&&i!==sections.length-1&&(
                  <div className="shimmer-border" style={{gridColumn:"1/-1",background:"rgba(204,255,0,.04)",border:"1px solid rgba(204,255,0,.2)",borderRadius:16,padding:"28px 32px",animation:"fadeIn .2s ease"}}>
                    <div style={{fontSize:"clamp(14px,1.6vw,16px)",color:"rgba(240,236,228,.75)",lineHeight:1.9,whiteSpace:"pre-line",cursor:IS_ADMIN?"pointer":"default"}}
                      onClick={()=>{if(IS_ADMIN){setEditing({key:s.key,label:"내용"});setEditVal(text);}}}>
                      {text}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{padding:"48px 20px 0",maxWidth:896,margin:"0 auto"}}>
        <button onClick={onBack}
          style={{width:"100%",background:"rgba(204,255,0,.08)",border:"1px solid rgba(204,255,0,.3)",borderRadius:16,padding:"20px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}>
          🏠 메인으로 돌아가기
        </button>
      </div>

      {editing&&IS_ADMIN&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#1a1a1a",borderRadius:20,padding:32,width:"100%",maxWidth:600,border:"1px solid rgba(204,255,0,.3)"}}>
            <div style={{fontSize:14,color:"#CCFF00",marginBottom:12,fontWeight:700}}>✏️ {editing.label} 수정</div>
            <textarea value={editVal} onChange={e=>setEditVal(e.target.value)}
              style={{width:"100%",minHeight:200,background:"rgba(255,255,255,.05)",border:"1px solid rgba(204,255,0,.3)",borderRadius:12,padding:16,color:"#f0ece4",fontSize:15,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:12,marginTop:16}}>
              <button onClick={async()=>{await onUpdate(editing.key,editVal);setEditing(null);}}
                style={{flex:1,background:"#CCFF00",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#0a0a0a",cursor:"pointer"}}>저장</button>
              <button onClick={()=>setEditing(null)}
                style={{flex:1,background:"rgba(255,255,255,.1)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#f0ece4",cursor:"pointer"}}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RegionGuidePage({onBack,IS_ADMIN,data,onUpdate}){
  const sections=[
    {
      num:"01",key:"rg_01",
      defaultTitle:"지역별 1:1 맞춤 상담",
      defaultItems:[
        {label:"담당 사입삼촌 지정",desc:"원하시는 해당 지역을 담당하는 사입삼촌과 직접 1:1 상담이 연결됩니다."},
        {label:"맞춤형 시스템 안내",desc:"사입삼촌마다 진행 스타일이 다를 수 있으므로, 구체적인 사입 금액(단가)과 업무 진행 시스템을 상세하게 안내해 드립니다."},
        {label:"사입 형태 제안",desc:"쇼핑몰 또는 옷가게(로드샵) 운영 규모와 물량에 맞춰 '일일사입'과 '월사입' 중 어떤 방식이 더 이익이고 효율적인지 가장 유리한 방향으로 상담해 드립니다."},
      ]
    },
    {
      num:"02",key:"rg_02",
      defaultTitle:"담당 삼촌과 진행 방식 안내",
      defaultItems:[
        {label:"진행 종류",desc:"사입 전용 프로그램 / 엑셀 파일 / 카카오톡 전달 / 정산 방법 / 배송 시간 등을 자세하게 안내받을 수 있으며, 운영 스타일에 맞는 방향으로 진행하실 수 있습니다."},
      ]
    },
    {
      num:"03",key:"rg_03",
      defaultTitle:"일일사입 / 월사입 상담",
      defaultItems:[
        {label:"월사입",desc:"매출 안정성을 원한다면 월사입을 추천드립니다."},
        {label:"일일사입",desc:"소량으로 유연하게 운영하려면 일일사입이 적합합니다."},
        {label:"상담 권장",desc:"운영 규모와 수량에 따라 다르기 때문에 어떤 방식이 더 효율적인지 담당 삼촌과 충분한 상담 후 결정하시는 것을 권장드립니다."},
      ]
    },
  ];

  const [openIdx,setOpenIdx]=useState(null);
  const [editing,setEditing]=useState(null);
  const [editVal,setEditVal]=useState("");
  const toggle=(i)=>setOpenIdx(prev=>prev===i?null:i);

  return(
    <div style={{minHeight:"100vh",paddingBottom:80}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 20px 0"}}>
        <button onClick={onBack}
          style={{background:"#CCFF00",border:"none",borderRadius:14,padding:"12px 24px",color:"#0a0a0a",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 0 20px rgba(204,255,0,.4)"}}>
          ← 메인
        </button>
      </div>

      <div style={{textAlign:"center",padding:"48px 20px 32px"}}>
        <div style={{fontSize:12,letterSpacing:".4em",color:"rgba(204,255,0,.6)",marginBottom:16,textTransform:"uppercase"}}>LOD · REGION GUIDE</div>
        <h1 style={{fontSize:"clamp(28px,5vw,52px)",fontWeight:900,color:"#f0ece4",lineHeight:1.2,marginBottom:16,textShadow:"0 0 20px rgba(204,255,0,.3)"}}>담당 지역 삼촌 안내</h1>
        <p style={{fontSize:"clamp(22px,2.2vw,26px)",color:"#CCFF00",fontWeight:700,letterSpacing:".05em",textAlign:"center",lineHeight:1.5,animation:"textGlow 2.5s ease-in-out infinite"}}>지역별 전담 삼촌이<br/>직접 연결됩니다</p>
      </div>

      <div style={{padding:"0 20px",maxWidth:1100,margin:"0 auto"}}>
        <div className="sg-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {sections.map((s,i)=>{
            const title=data[s.key+"_title"]||s.defaultTitle;
            const itemsRaw=data[s.key+"_items"];
            const items=itemsRaw?JSON.parse(itemsRaw):s.defaultItems;
            const isOpen=openIdx===i;
            return(
              <React.Fragment key={s.num}>
                <div onClick={()=>toggle(i)}
                  className={!isOpen?"shimmer-border":""}
                  style={{
                    background:isOpen?"rgba(204,255,0,.12)":"rgba(204,255,0,.03)",
                    border:`1.5px solid ${isOpen?"rgba(204,255,0,.7)":"rgba(204,255,0,.2)"}`,
                    borderRadius:16,padding:"22px 24px",cursor:"pointer",
                    transition:"all .25s",position:"relative",overflow:"hidden",
                    boxShadow:isOpen?"0 0 20px rgba(204,255,0,.15)":"none"
                  }}
                  onMouseEnter={e=>{if(!isOpen)e.currentTarget.style.background="rgba(204,255,0,.07)";}}
                  onMouseLeave={e=>{if(!isOpen)e.currentTarget.style.background="rgba(204,255,0,.03)";}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:"clamp(15px,1.6vw,18px)",fontWeight:900,color:isOpen?"#CCFF00":"#f0ece4",lineHeight:1.4,flex:1,whiteSpace:"pre-line",cursor:IS_ADMIN?"pointer":"default"}}
                      onClick={e=>{if(IS_ADMIN){e.stopPropagation();setEditing({key:s.key+"_title",label:"제목"});setEditVal(title);}}}>
                      {title}
                    </span>
                    <span style={{fontSize:14,color:"#CCFF00",transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .25s",display:"inline-block",flexShrink:0}}>▼</span>
                  </div>
                  {isOpen&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"linear-gradient(to right,transparent,rgba(204,255,0,.5),transparent)"}}/>}
                </div>

                {isOpen&&(i%3===2||(i===sections.length-1))&&(
                  <div className="shimmer-border" style={{gridColumn:"1/-1",background:"rgba(204,255,0,.04)",border:"1px solid rgba(204,255,0,.2)",borderRadius:16,padding:"28px 32px",animation:"fadeIn .2s ease"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      {items.map((item,j)=>(
                        <div key={j} style={{display:"flex",gap:12,alignItems:"flex-start",background:"rgba(255,255,255,.02)",borderRadius:12,padding:"14px 16px",border:"1px solid rgba(240,236,228,.05)"}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:"#CCFF00",flexShrink:0,marginTop:8,boxShadow:"0 0 6px rgba(204,255,0,.6)"}}/>
                          <div style={{flex:1}}>
                            <span style={{fontSize:"clamp(14px,1.5vw,15px)",fontWeight:900,color:"#CCFF00",cursor:IS_ADMIN?"pointer":"default"}}
                              onClick={()=>{if(IS_ADMIN){setEditing({key:s.key+"_label_"+j,label:"항목 제목",onSave:async(v)=>{const ni=[...items];ni[j]={...ni[j],label:v};await onUpdate(s.key+"_items",JSON.stringify(ni));setEditing(null);}});setEditVal(item.label);}}}>{item.label}</span>
                            <span style={{fontSize:"clamp(13px,1.4vw,14px)",color:"rgba(240,236,228,.75)",marginLeft:8,lineHeight:1.8,cursor:IS_ADMIN?"pointer":"default",whiteSpace:"pre-line"}}
                              onClick={()=>{if(IS_ADMIN){setEditing({key:s.key+"_desc_"+j,label:"항목 내용",onSave:async(v)=>{const ni=[...items];ni[j]={...ni[j],desc:v};await onUpdate(s.key+"_items",JSON.stringify(ni));setEditing(null);}});setEditVal(item.desc);}}}>{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isOpen&&i%3!==2&&i!==sections.length-1&&(
                  <div className="shimmer-border" style={{gridColumn:"1/-1",background:"rgba(204,255,0,.04)",border:"1px solid rgba(204,255,0,.2)",borderRadius:16,padding:"28px 32px",animation:"fadeIn .2s ease"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      {items.map((item,j)=>(
                        <div key={j} style={{display:"flex",gap:12,alignItems:"flex-start",background:"rgba(255,255,255,.02)",borderRadius:12,padding:"14px 16px",border:"1px solid rgba(240,236,228,.05)"}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:"#CCFF00",flexShrink:0,marginTop:8,boxShadow:"0 0 6px rgba(204,255,0,.6)"}}/>
                          <div style={{flex:1}}>
                            <span style={{fontSize:"clamp(14px,1.5vw,15px)",fontWeight:900,color:"#CCFF00",cursor:IS_ADMIN?"pointer":"default"}}
                              onClick={()=>{if(IS_ADMIN){setEditing({key:s.key+"_label_"+j,label:"항목 제목",onSave:async(v)=>{const ni=[...items];ni[j]={...ni[j],label:v};await onUpdate(s.key+"_items",JSON.stringify(ni));setEditing(null);}});setEditVal(item.label);}}}>{item.label}</span>
                            <span style={{fontSize:"clamp(13px,1.4vw,14px)",color:"rgba(240,236,228,.75)",marginLeft:8,lineHeight:1.8,cursor:IS_ADMIN?"pointer":"default",whiteSpace:"pre-line"}}
                              onClick={()=>{if(IS_ADMIN){setEditing({key:s.key+"_desc_"+j,label:"항목 내용",onSave:async(v)=>{const ni=[...items];ni[j]={...ni[j],desc:v};await onUpdate(s.key+"_items",JSON.stringify(ni));setEditing(null);}});setEditVal(item.desc);}}}>{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{padding:"48px 20px 0",maxWidth:896,margin:"0 auto"}}>
        <button onClick={onBack}
          style={{width:"100%",background:"rgba(204,255,0,.08)",border:"1px solid rgba(204,255,0,.3)",borderRadius:16,padding:"20px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}>
          🏠 메인으로 돌아가기
        </button>
      </div>

      {editing&&IS_ADMIN&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#1a1a1a",borderRadius:20,padding:32,width:"100%",maxWidth:600,border:"1px solid rgba(204,255,0,.3)"}}>
            <div style={{fontSize:14,color:"#CCFF00",marginBottom:12,fontWeight:700}}>✏️ {editing.label} 수정</div>
            <textarea value={editVal} onChange={e=>setEditVal(e.target.value)}
              style={{width:"100%",minHeight:200,background:"rgba(255,255,255,.05)",border:"1px solid rgba(204,255,0,.3)",borderRadius:12,padding:16,color:"#f0ece4",fontSize:15,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:12,marginTop:16}}>
              <button onClick={async()=>{if(editing.onSave){await editing.onSave(editVal);}else{await onUpdate(editing.key,editVal);setEditing(null);}}}
                style={{flex:1,background:"#CCFF00",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#0a0a0a",cursor:"pointer"}}>저장</button>
              <button onClick={()=>setEditing(null)}
                style={{flex:1,background:"rgba(255,255,255,.1)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#f0ece4",cursor:"pointer"}}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceGuidePage({onBack,IS_ADMIN,data,onUpdate}){
  const sections=[
    {
      num:"01",key:"sg_04",
      defaultTitle:"주문 및 픽업 프로세스",
      defaultItems:[
        {label:"다양한 주문 전달 방식",desc:"사입삼촌에 따라 사입 전용 프로그램, 엑셀 파일, 또는 도매 매장 주문 후 픽업 요청 등 최적의 방식으로 주문건을 전달받습니다."},
        {label:"신속한 야간 픽업 시작",desc:"도매 매장에 주문이 접수되면, 오후 8시 오픈 상가(APM, 누존 등)와 오후 12시 오픈 상가(디오트 등)를 순차적으로 방문하여 픽업을 진행합니다."},
        {label:"특이사항 실시간 체크",desc:"대납 진행과 동시에 품절이나 리오더 등 주문건에 대한 특이사항을 현장에서 꼼꼼하게 체크합니다."},
      ]
    },
    {
      num:"02",key:"sg_05",
      defaultTitle:"정확한 검수와 안전한 배송",
      defaultItems:[
        {label:"분류 및 합봉 작업",desc:"밤사이 모든 픽업이 끝나면 여러 곳에서 수거한 상품 봉투들을 업체별로 정확하게 분류합니다."},
        {label:"수량 확인 및 발송",desc:"최종 픽업 갯수를 철저히 확인한 후, 합봉 포장하여 배송을 시작합니다."},
        {label:"투명한 정산",desc:"모든 배송 완료 후, 개인 톡을 통해 당일 정산 내역서를 정확하게 보내드립니다."},
      ]
    },
    {
      num:"03",key:"sg_06",
      defaultTitle:"10년 이상 베테랑 삼촌들의 신뢰성",
      defaultItems:[
        {label:"검증된 경력과 책임감",desc:"동대문 현장에서 최소 10~15년 이상 발로 뛴 베테랑 전문가들로 구성되어 있습니다. 오랜 책임감으로 흔들림 없이 안정적인 서비스를 제공합니다."},
        {label:"강력한 도매 네트워크",desc:"동대문 수많은 도매 매장들과 두터운 신뢰 관계를 유지하고 있어 현장 소통이 원활합니다."},
        {label:"끝까지 책임지는 문제 해결",desc:"예기치 못한 문제가 발생하더라도, 해결될 때까지 최선을 다해 대표님의 비즈니스를 끝까지 서포트합니다."},
      ]
    },
  ];

  const [openIdx,setOpenIdx]=useState(null);
  const [editing,setEditing]=useState(null);
  const [editVal,setEditVal]=useState("");

  const toggle=(i)=>setOpenIdx(prev=>prev===i?null:i);

  return(
    <div style={{minHeight:"100vh",paddingBottom:80}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"16px 20px 0"}}>
        <button onClick={onBack}
          style={{background:"#CCFF00",border:"none",borderRadius:14,padding:"12px 24px",color:"#0a0a0a",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 0 20px rgba(204,255,0,.4)"}}>
          ← 메인
        </button>
      </div>

      <div style={{textAlign:"center",padding:"48px 20px 32px"}}>
        <div style={{fontSize:12,letterSpacing:".4em",color:"rgba(204,255,0,.6)",marginBottom:16,textTransform:"uppercase"}}>LOD · PROCESS GUIDE</div>
        <h1 style={{fontSize:"clamp(28px,5vw,52px)",fontWeight:900,color:"#f0ece4",lineHeight:1.2,marginBottom:16,textShadow:"0 0 20px rgba(204,255,0,.3)"}}>사입 진행 안내</h1>
        <p style={{fontSize:"clamp(22px,2.2vw,26px)",color:"#CCFF00",fontWeight:700,letterSpacing:".05em",textAlign:"center",lineHeight:1.5,animation:"textGlow 2.5s ease-in-out infinite"}}>처음부터 끝까지 대표님의<br/>든든한 파트너</p>
      </div>

      {/* 그리드 + 아코디언 */}
      <div style={{padding:"0 20px",maxWidth:1100,margin:"0 auto"}}>
        <div className="sg-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {sections.map((s,i)=>{
            const title=data[s.key+"_title"]||s.defaultTitle;
            const itemsRaw=data[s.key+"_items"];
            const items=itemsRaw?JSON.parse(itemsRaw):s.defaultItems;
            const isOpen=openIdx===i;
            return(
              <React.Fragment key={s.num}>
                {/* 탭 버튼 */}
                <div
                  onClick={()=>toggle(i)}
                  className={!isOpen?"shimmer-border":""}
                  style={{
                    background:isOpen?"rgba(204,255,0,.12)":"rgba(204,255,0,.03)",
                    border:`1.5px solid ${isOpen?"rgba(204,255,0,.7)":"rgba(204,255,0,.2)"}`,
                    borderRadius:16,padding:"22px 24px",cursor:"pointer",
                    transition:"all .25s",position:"relative",overflow:"hidden",
                    boxShadow:isOpen?"0 0 20px rgba(204,255,0,.15)":"none"
                  }}
                  onMouseEnter={e=>{if(!isOpen)e.currentTarget.style.background="rgba(204,255,0,.07)";}}
                  onMouseLeave={e=>{if(!isOpen)e.currentTarget.style.background="rgba(204,255,0,.03)";}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:"clamp(15px,1.6vw,18px)",fontWeight:900,color:isOpen?"#CCFF00":"#f0ece4",lineHeight:1.4,cursor:IS_ADMIN?"pointer":"default",flex:1,whiteSpace:"pre-line"}}
                      onClick={e=>{if(IS_ADMIN){e.stopPropagation();setEditing({key:s.key+"_title",label:"제목"});setEditVal(title);}}}>
                      {title}
                    </span>
                    <span style={{fontSize:14,color:"#CCFF00",transform:isOpen?"rotate(180deg)":"rotate(0deg)",transition:"transform .25s",display:"inline-block",flexShrink:0}}>▼</span>
                  </div>
                  {isOpen&&<div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"linear-gradient(to right,transparent,rgba(204,255,0,.5),transparent)"}}/>}
                </div>

                {/* 펼쳐지는 내용 - 같은 행의 마지막 아이템 다음에 전체 너비로 표시 */}
                {isOpen&&(i%3===2||(i===sections.length-1))&&(
                  <div className="shimmer-border" style={{gridColumn:"1/-1",background:"rgba(204,255,0,.04)",border:"1px solid rgba(204,255,0,.2)",borderRadius:16,padding:"28px 32px",animation:"fadeIn .2s ease"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      {items.map((item,j)=>(
                        <div key={j} style={{display:"flex",gap:12,alignItems:"flex-start",background:"rgba(255,255,255,.02)",borderRadius:12,padding:"14px 16px",border:"1px solid rgba(240,236,228,.05)"}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:"#CCFF00",flexShrink:0,marginTop:8,boxShadow:"0 0 6px rgba(204,255,0,.6)"}}/>
                          <div style={{flex:1}}>
                            <span style={{fontSize:"clamp(14px,1.5vw,15px)",fontWeight:900,color:"#CCFF00",cursor:IS_ADMIN?"pointer":"default"}}
                              onClick={()=>{if(IS_ADMIN){setEditing({key:s.key+"_label_"+j,label:"항목 제목",onSave:async(v)=>{const ni=[...items];ni[j]={...ni[j],label:v};await onUpdate(s.key+"_items",JSON.stringify(ni));setEditing(null);}});setEditVal(item.label);}}}>{item.label}</span>
                            <span style={{fontSize:"clamp(13px,1.4vw,14px)",color:"rgba(240,236,228,.75)",marginLeft:8,lineHeight:1.8,cursor:IS_ADMIN?"pointer":"default",whiteSpace:"pre-line"}}
                              onClick={()=>{if(IS_ADMIN){setEditing({key:s.key+"_desc_"+j,label:"항목 내용",onSave:async(v)=>{const ni=[...items];ni[j]={...ni[j],desc:v};await onUpdate(s.key+"_items",JSON.stringify(ni));setEditing(null);}});setEditVal(item.desc);}}}>{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {isOpen&&i%3!==2&&i!==sections.length-1&&(
                  <div className="shimmer-border" style={{gridColumn:"1/-1",background:"rgba(204,255,0,.04)",border:"1px solid rgba(204,255,0,.2)",borderRadius:16,padding:"28px 32px",animation:"fadeIn .2s ease"}}>
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>
                      {items.map((item,j)=>(
                        <div key={j} style={{display:"flex",gap:12,alignItems:"flex-start",background:"rgba(255,255,255,.02)",borderRadius:12,padding:"14px 16px",border:"1px solid rgba(240,236,228,.05)"}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:"#CCFF00",flexShrink:0,marginTop:8,boxShadow:"0 0 6px rgba(204,255,0,.6)"}}/>
                          <div style={{flex:1}}>
                            <span style={{fontSize:"clamp(14px,1.5vw,15px)",fontWeight:900,color:"#CCFF00",cursor:IS_ADMIN?"pointer":"default"}}
                              onClick={()=>{if(IS_ADMIN){setEditing({key:s.key+"_label_"+j,label:"항목 제목",onSave:async(v)=>{const ni=[...items];ni[j]={...ni[j],label:v};await onUpdate(s.key+"_items",JSON.stringify(ni));setEditing(null);}});setEditVal(item.label);}}}>{item.label}</span>
                            <span style={{fontSize:"clamp(13px,1.4vw,14px)",color:"rgba(240,236,228,.75)",marginLeft:8,lineHeight:1.8,cursor:IS_ADMIN?"pointer":"default",whiteSpace:"pre-line"}}
                              onClick={()=>{if(IS_ADMIN){setEditing({key:s.key+"_desc_"+j,label:"항목 내용",onSave:async(v)=>{const ni=[...items];ni[j]={...ni[j],desc:v};await onUpdate(s.key+"_items",JSON.stringify(ni));setEditing(null);}});setEditVal(item.desc);}}}>{item.desc}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{padding:"48px 20px 0",maxWidth:896,margin:"0 auto"}}>
        <button onClick={onBack}
          style={{width:"100%",background:"rgba(204,255,0,.08)",border:"1px solid rgba(204,255,0,.3)",borderRadius:16,padding:"20px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}>
          🏠 메인으로 돌아가기
        </button>
      </div>

      {editing&&IS_ADMIN&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#1a1a1a",borderRadius:20,padding:32,width:"100%",maxWidth:600,border:"1px solid rgba(204,255,0,.3)"}}>
            <div style={{fontSize:14,color:"#CCFF00",marginBottom:12,fontWeight:700}}>✏️ {editing.label} 수정</div>
            <textarea value={editVal} onChange={e=>setEditVal(e.target.value)}
              style={{width:"100%",minHeight:200,background:"rgba(255,255,255,.05)",border:"1px solid rgba(204,255,0,.3)",borderRadius:12,padding:16,color:"#f0ece4",fontSize:15,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:12,marginTop:16}}>
              <button onClick={async()=>{await onUpdate(editing.key,editVal);setEditing(null);}}
                style={{flex:1,background:"#CCFF00",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#0a0a0a",cursor:"pointer"}}>저장</button>
              <button onClick={()=>setEditing(null)}
                style={{flex:1,background:"rgba(255,255,255,.1)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#f0ece4",cursor:"pointer"}}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaipUnclePage({onBack,IS_ADMIN,data,onUpdate}){
  const sections=[
    {
      num:"01",
      title:"사입삼촌은 누구인가요?",
      key:"saip_uncle_01",
      defaultText:"동대문 새벽시장 패션 유통의 중심에서 쇼핑몰과 옷가게(로드샵), 동대문 새벽시장을 연결하는 현장 핵심 실무자입니다. 단순히 물건을 픽업하고 전달하는 사입대행업자를 넘어, 복잡하고 빠르게 돌아가는 동대문 시장의 유통 구조를 실질적으로 움직이는 역할을 합니다.\n\n쉽게 말하면, 쇼핑몰과 옷가게(로드샵) 사장님들이 동대문 새벽시장 도매시장과 원활하게 거래할 수 있도록 연결해주는 현장 전문가라고 이해하면 됩니다."
    },
    {
      num:"02",
      title:"단순한 심부름이 아닌 이유",
      key:"saip_uncle_02",
      defaultText:"사입삼촌은 단순히 상품을 가져다주는 배달부가 아닙니다.\n\n동대문 시장 거래는 아직도 사람과 사람 사이의 신뢰로 움직입니다. 오랫동안 거래해온 매장 사장님과의 관계 덕분에 품절된 상품도 먼저 연락받고, 좋은 상품을 우선적으로 챙겨받을 수 있습니다.\n\n또한 상품에 문제가 생겼을 때 도매 매장과 쇼핑몰, 옷가게(로드샵) 사장님 사이에서 신뢰를 바탕으로 원만하게 해결해주는 역할도 합니다. 오랜 현장 경험에서 쌓인 이 신뢰 관계야말로 사입삼촌의 가장 큰 가치입니다.\n\n실제로 도매 매장과 신뢰가 깊은 사입삼촌에게는 주문 수량이 조금 부족할 때 매장에서 한 장을 더 챙겨주는 경우도 있습니다. 반대로 관계가 좋지 않은 사입삼촌의 주문 건에서는 수량이 줄어드는 일도 생깁니다. 사입삼촌마다 도매 매장과의 관계가 다르기 때문에 좋은 삼촌을 선택하는 것이 중요합니다."
    }
  ];

  const [editing,setEditing]=useState(null);
  const [editVal,setEditVal]=useState("");

  return(
    <div style={{minHeight:"100vh",paddingBottom:80}}>
      {/* 뒤로가기 */}
      <div style={{maxWidth:896,margin:"0 auto",padding:"16px 20px 0"}}>
        <button onClick={onBack}
          style={{background:"#CCFF00",border:"none",borderRadius:14,padding:"12px 24px",color:"#0a0a0a",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:"0 0 20px rgba(204,255,0,.4)"}}>
          ← 메인
        </button>
      </div>

      {/* 타이틀 */}
      <div style={{textAlign:"center",padding:"48px 20px 32px"}}>
        <div style={{fontSize:12,letterSpacing:".4em",color:"rgba(204,255,0,.6)",marginBottom:16,textTransform:"uppercase"}}>LOD · GUIDE</div>
        <h1 style={{fontSize:"clamp(32px,5vw,56px)",fontWeight:900,color:"#f0ece4",lineHeight:1.2,marginBottom:16,textShadow:"0 0 20px rgba(204,255,0,.3)"}}>사입삼촌이란?</h1>
        <p style={{fontSize:"clamp(16px,2vw,20px)",color:"#CCFF00",fontWeight:700,letterSpacing:".05em",animation:"textGlow 2.5s ease-in-out infinite"}}>현장과 쇼핑몰을 잇는 가장 확실한 파트너</p>
      </div>

      {/* 2단 레이아웃 */}
      <div style={{padding:"0 20px",maxWidth:896,margin:"0 auto",display:"flex",flexDirection:"column",gap:24}}>

          {sections.map((s)=>{
            const text=data[s.key]||s.defaultText;
            return(
              <div key={s.num} className="shimmer-border scroll-reveal visible"
                style={{background:"rgba(204,255,0,.03)",borderRadius:20,padding:"28px 32px",position:"relative",overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:18}}>
                  <div className="section-circle-num" style={{width:48,height:48,borderRadius:"50%",background:"rgba(204,255,0,.1)",border:"1.5px solid rgba(204,255,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900,color:"#CCFF00",flexShrink:0}}>{s.num}</div>
                  <h2 style={{fontSize:"clamp(18px,2vw,24px)",fontWeight:900,color:"#f0ece4",cursor:IS_ADMIN?"pointer":"default"}}
                    onClick={()=>{if(IS_ADMIN){setEditing({key:s.key,type:"title"});setEditVal(s.title);}}}>
                    {s.title}
                  </h2>
                </div>
                <div style={{fontSize:"clamp(14px,1.6vw,16px)",color:"rgba(240,236,228,.75)",lineHeight:1.9,whiteSpace:"pre-line",cursor:IS_ADMIN?"pointer":"default"}}
                  onClick={()=>{if(IS_ADMIN){setEditing({key:s.key,type:"text"});setEditVal(text);}}}>
                  {text}
                </div>
                <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"linear-gradient(to right,transparent,rgba(204,255,0,.25),transparent)"}}/>
              </div>
            );
          })}
      </div>{/* end grid */}

      {/* 하단 버튼 */}
      <div style={{padding:"48px 20px 0",maxWidth:896,margin:"0 auto"}}>
        <button onClick={onBack}
          style={{width:"100%",background:"rgba(204,255,0,.08)",border:"1px solid rgba(204,255,0,.3)",borderRadius:16,padding:"20px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
          onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}>
          🏠 메인으로 돌아가기
        </button>
      </div>

      {/* 관리자 편집 모달 */}
      {editing&&IS_ADMIN&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:800,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#1a1a1a",borderRadius:20,padding:32,width:"100%",maxWidth:600,border:"1px solid rgba(204,255,0,.3)"}}>
            <div style={{fontSize:14,color:"#CCFF00",marginBottom:12,fontWeight:700}}>내용 수정</div>
            <textarea value={editVal} onChange={e=>setEditVal(e.target.value)}
              style={{width:"100%",minHeight:200,background:"rgba(255,255,255,.05)",border:"1px solid rgba(204,255,0,.3)",borderRadius:12,padding:16,color:"#f0ece4",fontSize:15,fontFamily:"inherit",resize:"vertical",outline:"none",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:12,marginTop:16}}>
              <button onClick={async()=>{await onUpdate(editing.key,editVal);setEditing(null);}}
                style={{flex:1,background:"#CCFF00",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#0a0a0a",cursor:"pointer"}}>저장</button>
              <button onClick={()=>setEditing(null)}
                style={{flex:1,background:"rgba(255,255,255,.1)",border:"none",borderRadius:12,padding:"14px",fontSize:15,fontWeight:900,color:"#f0ece4",cursor:"pointer"}}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App(){
  const clock=useClock();
  const [loading,setLoading]=useState(false);
  const [page,setPage]=useState("main");
  const [menuOpen,setMenuOpen]=useState(false);
  const counterRef=useRef(null);
  const careerRef=useRef(null);
  const [ag,setAg]=useState(null);
  const [data,setData]=useState({...DEFAULTS});
  const [looks,setLooks]=useState([1,2,3,4].map(i=>({id:i,url:""})));
  const [editField,setEditField]=useState(null);
  const [saipLink,setSaipLink]=useState(()=>{try{return localStorage.getItem("saip_link")||DEFAULTS["사입 프로그램"];}catch{return DEFAULTS["사입 프로그램"];}});
  const [consultLink,setConsultLink]=useState(()=>{try{return localStorage.getItem("saip_consult")||"";}catch{return "";}});
  const [tiktokBannerLink,setTiktokBannerLink]=useState(()=>{try{return localStorage.getItem("lod_tiktok_link")||"https://www.tiktok.com/@glggid";}catch{return "https://www.tiktok.com/@glggid";}});

  useEffect(()=>{
    loadSheet(d=>{
      setData(d);
      setLooks([1,2,3,4].map(i=>({id:i,url:d[`룩북${i}_URL`]||""})));
      if(d["사입 프로그램"]){setSaipLink(d["사입 프로그램"]);}
      if(d["상담 링크"]){setConsultLink(d["상담 링크"]);}
    });
  },[]);

  const handleSave=async(key,val)=>{setData(d=>({...d,[key]:val}));await saveToSheet(key,val);};
  const goAgent=a=>{setAg(a);setPage("agent");setMenuOpen(false);window.history.pushState({page:"agent"},"");};
  const goSaipUncle=()=>{setPage("saip-uncle");setMenuOpen(false);window.history.pushState({page:"saip-uncle"},"");};
  const goFaq=()=>{setPage("faq");setMenuOpen(false);window.history.pushState({page:"faq"},"");};
  const goServiceGuide=()=>{setPage("service-guide");setMenuOpen(false);window.history.pushState({page:"service-guide"},"");};
  const goWhyUncle=()=>{setPage("why-uncle");setMenuOpen(false);window.history.pushState({page:"why-uncle"},"");};
  const goRegionGuide=()=>{setPage("region-guide");setMenuOpen(false);window.history.pushState({page:"region-guide"},"");};
  const goMain=()=>{
  setPage("main");
  setAg(null);
  setTimeout(function(){
    var els=document.querySelectorAll(".scroll-reveal");
    els.forEach(function(el){el.classList.add("visible");});
  },100);
};
  useEffect(()=>{window.addEventListener("popstate",goMain);return()=>window.removeEventListener("popstate",goMain);},[]);

  // 로딩바 타이머
  useEffect(()=>{
    const timer=setTimeout(()=>setLoading(false),1800);
    return()=>clearTimeout(timer);
  },[]);

  // ✅ 로딩화면
  useEffect(()=>{
    const timer=setTimeout(()=>setLoading(false),1800);
    return()=>clearTimeout(timer);
  },[]);

  // ✅ 스크롤 애니메이션 + 카운터
  useEffect(()=>{
    if(page!=="main") return;
    const timer=setTimeout(()=>{
      // 스크롤 애니메이션
      const els=document.querySelectorAll(".scroll-reveal");
      const obs=new IntersectionObserver((entries)=>{
        entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("visible");});
      },{threshold:0.1});
      els.forEach(el=>obs.observe(el));

      // 카운터
      const cEl=document.getElementById("career-counter");
      if(cEl){
        const cObs=new IntersectionObserver((entries)=>{
          entries.forEach(e=>{
            if(e.isIntersecting){
              const duration=1500;
              const startTime=performance.now();
              const tick=(now)=>{
                const p=Math.min((now-startTime)/duration,1);
                cEl.textContent=Math.floor(p*15);
                if(p<1)requestAnimationFrame(tick);
                else cEl.textContent=15;
              };
              requestAnimationFrame(tick);
              cObs.disconnect();
            }
          });
        },{threshold:0.5});
        cObs.observe(cEl);
      }
    },300);
    return()=>clearTimeout(timer);
  },[page]);



  const agents=[
    {id:"SN",label:data["강북팀 이름"],kakao:data["강북팀 카카오"],intro:data["강북팀 소개"],regionEn:"SEOUL NORTH AREA"},
    {id:"AY",label:data["안양팀 이름"],kakao:data["안양팀 카카오"],intro:data["안양팀 소개"],regionEn:"ANYANG · GWACHEON"},
    {id:"IB",label:data["인천팀 이름"],kakao:data["인천팀 카카오"],intro:data["인천팀 소개"],regionEn:"INCHEON · BUCHEON"},
  ];

  if(page==="faq"){
    return(
      <div className="shell">
        <FaqPage onBack={goMain} IS_ADMIN={IS_ADMIN} data={data} onUpdate={handleSave}/>
      </div>
    );
  }

  if(page==="region-guide"){
    return(
      <div className="shell">
        <RegionGuidePage onBack={goMain} IS_ADMIN={IS_ADMIN} data={data} onUpdate={handleSave}/>
      </div>
    );
  }

  if(page==="why-uncle"){
    return(
      <div className="shell">
        <WhyUnclePage onBack={goMain} IS_ADMIN={IS_ADMIN} data={data} onUpdate={handleSave}/>
      </div>
    );
  }

  if(page==="service-guide"){
    return(
      <div className="shell">
        <ServiceGuidePage onBack={goMain} IS_ADMIN={IS_ADMIN} data={data} onUpdate={handleSave}/>
      </div>
    );
  }

  if(page==="saip-uncle"){
    return(
      <div className="shell">
        <SaipUnclePage onBack={goMain} onNav={goSaipUncle} IS_ADMIN={IS_ADMIN} data={data} onUpdate={handleSave}/>
      </div>
    );
  }

  if(page==="agent"&&ag){
    return(
      <div className="shell">
        <AgentPage ag={ag} onBack={goMain} allAgents={agents} onAgent={goAgent} data={data} onUpdate={(k,v)=>setData(d=>({...d,[k]:v}))} saipLink={saipLink}/>
      </div>
    );
  }

  return(
    <div className="shell">
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
        {[...Array(16)].map((_,i)=>(
          <div key={i} style={{position:"absolute",width:3,height:3,borderRadius:"50%",background:"rgba(204,255,0,.4)",left:`${5+i*6}%`,top:`${50+((i*41)%50)}%`,animation:`float ${5+i%4}s linear ${i*.6}s infinite`}}/>
        ))}
      </div>

      {IS_ADMIN&&(
        <div style={{background:"rgba(204,255,0,.08)",borderBottom:"1px solid rgba(204,255,0,.2)",padding:"10px 20px",textAlign:"center",fontSize:12,color:"#CCFF00",fontWeight:700,position:"relative",zIndex:1}}>
          🔐 관리자 모드 — 글자를 클릭해서 수정하세요
        </div>
      )}

      {/* 햄버거 메뉴 - 모바일 전용, 좌측 상단 */}
      <div className="hamburger-wrap" style={{position:"fixed",top:16,left:16,zIndex:500}}>
        <button onClick={()=>setMenuOpen(o=>!o)}
          style={{background:"rgba(10,10,10,.9)",border:"1px solid rgba(204,255,0,.3)",borderRadius:12,width:44,height:44,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,cursor:"pointer",padding:0,backdropFilter:"blur(10px)"}}>
          <span style={{width:20,height:2,background:"#CCFF00",borderRadius:2}}/>
          <span style={{width:20,height:2,background:"#CCFF00",borderRadius:2}}/>
          <span style={{width:20,height:2,background:"#CCFF00",borderRadius:2}}/>
        </button>
        {menuOpen&&(
          <div style={{position:"absolute",top:52,left:0,background:"rgba(10,10,10,.97)",border:"1px solid rgba(204,255,0,.3)",borderRadius:16,padding:"12px 0",minWidth:200,backdropFilter:"blur(20px)",boxShadow:"0 8px 32px rgba(0,0,0,.5)"}}>
            <button onClick={goMain} style={{width:"100%",background:"none",border:"none",padding:"12px 20px",textAlign:"left",color:"#f0ece4",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              🏠 메인
            </button>
            <button onClick={goSaipUncle} style={{width:"100%",background:"none",border:"none",padding:"12px 20px",textAlign:"left",color:"#CCFF00",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              사입삼촌이란?
            </button>
            <button onClick={goWhyUncle} style={{width:"100%",background:"none",border:"none",padding:"12px 20px",textAlign:"left",color:"#CCFF00",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              사입삼촌이 필요한 이유
            </button>
            <button onClick={goRegionGuide} style={{width:"100%",background:"none",border:"none",padding:"12px 20px",textAlign:"left",color:"#CCFF00",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              담당 지역 삼촌 안내
            </button>
            <button onClick={goServiceGuide} style={{width:"100%",background:"none",border:"none",padding:"12px 20px",textAlign:"left",color:"#CCFF00",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              사입 진행 안내
            </button>
            <button onClick={goFaq} style={{width:"100%",background:"none",border:"none",padding:"12px 20px",textAlign:"left",color:"#CCFF00",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:10}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}
              onMouseLeave={e=>e.currentTarget.style.background="none"}>
              자주 묻는 질문
            </button>
          </div>
        )}
      </div>

      <div className="hero-bg" style={{position:"relative",zIndex:1}}>
        <div className="inner">

          {/* ===== 버튼 바: 네비 아래 100px, 영상/로고 위 24px ===== */}
          <div className="saip-uncle-btn-wrap" style={{paddingTop:100,paddingBottom:24,display:"flex",alignItems:"center",gap:6}}>
                <button onClick={goSaipUncle} className="shimmer-border"
                  style={{background:"rgba(204,255,0,.06)",border:"1px solid rgba(204,255,0,.6)",borderRadius:10,padding:"12px 28px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s",animation:"limeGlow 2.5s ease-in-out infinite"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.06)"}>
                  사입삼촌이란?
                </button>
                <button onClick={goWhyUncle} className="shimmer-border"
                  style={{background:"rgba(204,255,0,.06)",border:"1px solid rgba(204,255,0,.6)",borderRadius:10,padding:"12px 28px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s",animation:"limeGlow 2.5s ease-in-out infinite"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.06)"}>
                  사입삼촌이 필요한 이유
                </button>
                <button onClick={goRegionGuide} className="shimmer-border"
                  style={{background:"rgba(204,255,0,.06)",border:"1px solid rgba(204,255,0,.6)",borderRadius:10,padding:"12px 28px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s",animation:"limeGlow 2.5s ease-in-out infinite"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.06)"}>
                  담당 지역 삼촌 안내
                </button>
                <button onClick={goServiceGuide} className="shimmer-border"
                  style={{background:"rgba(204,255,0,.06)",border:"1px solid rgba(204,255,0,.6)",borderRadius:10,padding:"12px 28px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s",animation:"limeGlow 2.5s ease-in-out infinite"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.06)"}>
                  사입 진행 안내
                </button>
                <button onClick={goFaq} className="shimmer-border"
                  style={{background:"rgba(204,255,0,.06)",border:"1px solid rgba(204,255,0,.6)",borderRadius:10,padding:"12px 28px",color:"#CCFF00",fontSize:16,fontWeight:900,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s",animation:"limeGlow 2.5s ease-in-out infinite"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
                  onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.06)"}>
                  자주 묻는 질문
                </button>
          </div>

          {/* ===== 영상 + 로고 그리드 ===== */}
          <div className="hero-grid">
            <div style={{width:"100%",height:"100%"}}>
              <div style={{width:"100%",height:"100%"}}>
                <MainVideoBox url={data["메인 영상 URL"]} onSave={url=>setData(d=>({...d,"메인 영상 URL":url}))}/>
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-start",alignItems:"flex-start",textAlign:"left",gap:16}}>
              <div style={{width:"100%"}}>
                <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
                  <div style={{filter:"drop-shadow(0 0 8px rgba(255,255,255,.5)) drop-shadow(0 0 16px rgba(255,255,255,.25))",flexShrink:0}}><LDLogo size={120}/></div>
                  <div style={{fontSize:"clamp(38px,5.5vw,58px)",fontWeight:900,color:"#f0ece4",lineHeight:1.2,textAlign:"left",textShadow:"0 0 10px rgba(204,255,0,.4),0 0 20px rgba(204,255,0,.2),0 0 40px rgba(204,255,0,.1)"}}>
                    <span className="hero-title-pc">동대문 새벽시장<br/>전문 사입 서비스</span>
                    <span className="hero-title-mobile" style={{display:"none",textAlign:"center"}}>동대문<br/>새벽시장<br/>전문<br/>사입서비스</span>
                  </div>
                </div>

                <a href={consultLink||"#"} target="_blank" rel="noopener noreferrer"
                  style={{width:"100%",border:"2px solid rgba(255,255,255,.85)",borderRadius:16,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box",textDecoration:"none",transition:"all .3s",animation:"whiteGlow 2.5s ease-in-out infinite",background:"rgba(255,255,255,.03)"}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.1)";e.currentTarget.style.boxShadow="0 0 50px rgba(255,255,255,.4)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.03)";e.currentTarget.style.boxShadow="";}}>
                  <div style={{textAlign:"center"}}>
                    <div style={{fontSize:"clamp(18px,2.2vw,26px)",fontWeight:900,color:"#f0ece4"}}>사입 삼촌 실시간 상담 ▶</div>
                    <div style={{fontSize:"clamp(13px,1.4vw,16px)",color:"rgba(240,236,228,.45)",marginTop:4}}>PM 19:00 ~ AM 11:00 상담 가능</div>
                  </div>
                </a>
                {IS_ADMIN&&(
                  <div style={{display:"flex",gap:6,alignItems:"center",width:"100%",marginTop:6}}>
                    <span style={{fontSize:10,color:"rgba(240,236,228,.4)",whiteSpace:"nowrap"}}>상담 링크:</span>
                    <input defaultValue={consultLink} onBlur={async e=>{const v=e.target.value;setConsultLink(v);try{localStorage.setItem("saip_consult",v);}catch{}await saveToSheet("상담 링크",v);}}
                      style={{flex:1,background:"rgba(255,255,255,.07)",border:"1px solid rgba(240,236,228,.2)",borderRadius:10,padding:"6px 10px",fontSize:11,color:"#f0ece4",fontFamily:"inherit",outline:"none"}}/>
                  </div>
                )}
              </div>

              <div style={{width:"100%",background:"rgba(204,255,0,.04)",border:"1px solid rgba(204,255,0,.3)",borderRadius:16,animation:"limeGlow 2.5s ease-in-out infinite",padding:"24px 28px",boxSizing:"border-box",flex:1,display:"flex",flexDirection:"column",justifyContent:"center"}}>
                <div style={{fontSize:16,letterSpacing:".3em",color:"rgba(204,255,0,.6)",marginBottom:20,fontWeight:700,textAlign:"left"}}>PROCESS</div>
                <div className="process-grid" style={{display:"flex",alignItems:"flex-start",justifyContent:"space-evenly"}}>
                  {[{label:"사입\n신청",num:"01"},{label:"현장\n픽업",num:"02"},{label:"지역별\n분류",num:"03"},{label:"안전\n배송",num:"04"}].map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center"}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                        <div style={{width:66,height:66,borderRadius:"50%",background:"rgba(204,255,0,.1)",border:"1.5px solid rgba(204,255,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:900,color:"#CCFF00"}}>{s.num}</div>
                        <div style={{fontSize:18,fontWeight:700,color:"rgba(240,236,228,.85)",textAlign:"center",lineHeight:1.4,whiteSpace:"pre-line"}}>{s.label}</div>
                      </div>
                      {i<3&&<div style={{color:"#CCFF00",fontSize:20,fontWeight:900,flexShrink:0,margin:"0 8px",marginBottom:44}}>▶</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>


          </div>
        </div>
      </div>

      <div className="inner scroll-reveal" style={{paddingTop:24,paddingBottom:8,position:"relative",zIndex:1,textAlign:"center"}}>
        <p style={{fontSize:"clamp(22px,2.4vw,28px)",color:"rgba(240,236,228,.8)",lineHeight:1.9,margin:0,fontWeight:700}}>
          지역 담당 삼촌들의 평균 경력은 <span style={{color:"#CCFF00"}}>10~<span id="career-counter">15</span>년 이상</span>의 베테랑들입니다.<br/>
          트렌드와 마켓 정보를 함께 공유해 드립니다.
        </p>
      </div>

      {(data["공지사항"]||IS_ADMIN)&&(
        <div className="inner" style={{marginTop:24,position:"relative",zIndex:1}}>
          <div style={{background:"rgba(204,255,0,.08)",border:"1px solid rgba(204,255,0,.3)",borderRadius:16,padding:"12px 18px",fontSize:14,fontWeight:700,color:"#CCFF00",textAlign:"center",lineHeight:1.6,cursor:IS_ADMIN?"pointer":"default"}}
            onClick={()=>IS_ADMIN&&setEditField({key:"공지사항",label:"공지사항",value:data["공지사항"]||""})}>
            {data["공지사항"]||"📢 (공지사항을 입력하세요)"}
          </div>
        </div>
      )}


      <div className="inner scroll-reveal" style={{paddingTop:48,position:"relative",zIndex:1}}>
        <div style={{position:"relative",borderRadius:20,padding:"40px 32px"}} className="shimmer-border">
          <div style={{marginBottom:12,textAlign:"center"}}>
            <div className="section-num">AREA</div>
            <div className="section-main-title" style={{justifyContent:"center",fontSize:"clamp(36px,4vw,58px)"}}>지역 담당 선택</div>
            <div className="section-sub-title">SELECT YOUR REGION</div>
          </div>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{fontSize:"clamp(18px,2vw,24px)",fontWeight:700,color:"#CCFF00",marginBottom:8}}>해당하는 지역을 선택해 주세요</div>
            <div style={{fontSize:"clamp(18px,2vw,24px)",fontWeight:700,color:"#f0ece4",animation:"textGlow 2.5s ease-in-out infinite"}}>지역이 없을 경우 상단 사입 삼촌 실시간 상담으로 문의해 주세요</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"auto auto",gap:16}} className="region-grid">
            {agents.map((ag,idx)=>(
              <button key={ag.id} onClick={()=>goAgent(ag)} className="shimmer-border"
                style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12,width:"100%",border:"none",borderRadius:20,cursor:"pointer",fontFamily:"inherit",padding:"24px 28px",background:"rgba(204,255,0,.08)",transition:"all .2s",gridColumn:ag.id==="IB"?"2":"1",gridRow:ag.id==="SN"?"1":ag.id==="AY"?"2":"1"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(204,255,0,.15)"}
                onMouseLeave={e=>e.currentTarget.style.background="rgba(204,255,0,.08)"}>
                <div style={{fontSize:"clamp(16px,2vw,24px)",fontWeight:900,color:"#CCFF00",textAlign:"center",whiteSpace:"nowrap"}}>
                  {data[ag.id==="SN"?"강북팀 이름":ag.id==="AY"?"안양팀 이름":"인천팀 이름"]||ag.label}
                </div>
                <span style={{fontSize:"clamp(16px,2vw,24px)",color:"#CCFF00",fontWeight:900,flexShrink:0}}>▶</span>
              </button>
            ))}
            {/* 빈 공간 */}
            <div style={{gridColumn:"2",gridRow:"2"}}/>
          </div>
        </div>
      </div>

      <div className="inner" style={{position:"relative",zIndex:1}}>
        <div className="divider"><div className="divider-diamond"/></div>
      </div>

      <div className="inner scroll-reveal" style={{position:"relative",zIndex:1}}>
        <div style={{marginBottom:8}}>
          <div style={{fontSize:"clamp(60px,10vw,110px)",letterSpacing:".3em",color:"rgba(240,236,228,.04)",fontWeight:900,lineHeight:1,marginBottom:-20}}>AI EDITORIAL</div>
          <div className="section-main-title" style={{position:"relative",zIndex:1,fontSize:"clamp(42px,6vw,80px)",textShadow:"0 0 10px rgba(204,255,0,.7),0 0 20px rgba(204,255,0,.4),0 0 40px rgba(204,255,0,.2)"}}>인플루언서 패션 AI 모델 제작</div>
          <div className="section-sub-title">L O D COLLECTION 2026</div>
        </div>
      </div>
      <div className="grid4 scroll-reveal" style={{position:"relative",zIndex:1}}>
        {looks.map(l=>(
          <LookCard key={l.id} id={l.id} url={l.url} onSaved={(id,url)=>setLooks(ls=>ls.map(x=>x.id===id?{...x,url}:x))}/>
        ))}
      </div>

      {/* ✅ AI 모델 배너 섹션 */}
      <div className="inner scroll-reveal"><AIBanner IS_ADMIN={IS_ADMIN} uploadFile={uploadFile} saveToSheet={saveToSheet} aiInquiryLink={data["AI 문의 링크"]} tiktokBannerLink={tiktokBannerLink}/></div>

      {IS_ADMIN&&(
        <div className="inner" style={{paddingTop:0,paddingBottom:8}}>
          <div style={{padding:"10px 16px",background:"rgba(204,255,0,.06)",border:"1px solid rgba(204,255,0,.2)",borderRadius:12,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,color:"rgba(204,255,0,.7)",whiteSpace:"nowrap",fontWeight:700}}>🎵 틱톡 링크:</span>
            <input defaultValue={tiktokBannerLink} placeholder="https://www.tiktok.com/@..."
              onBlur={async(e)=>{const v=e.target.value;setTiktokBannerLink(v);localStorage.setItem("lod_tiktok_link",v);await saveToSheet("AI배너_틱톡링크",v);}}
              style={{flex:1,background:"transparent",border:"none",borderBottom:"1px solid rgba(204,255,0,.3)",outline:"none",color:"#f0ece4",fontSize:12,fontFamily:"inherit",padding:"4px 0"}}/>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer style={{padding:"40px 0",textAlign:"center",borderTop:"1px solid rgba(240,236,228,.07)",background:"#0d0d0d",position:"relative",zIndex:1}}>
        <LDLogo size={40}/>
        <div style={{fontSize:14,fontWeight:900,letterSpacing:".26em",color:"rgba(240,236,228,.2)",margin:"10px 0"}}>L O D</div>
        <p style={{fontSize:11,color:"rgba(240,236,228,.18)",letterSpacing:".1em",lineHeight:2.1}}>
          Layer On Drape · 동대문 새벽시장 전문 사입 서비스<br/>정확한 픽업, 꼼꼼한 검수 · 마감 AM 03:00
        </p>
      </footer>

      {editField&&<EditModal label={editField.label} value={editField.value} onSave={val=>handleSave(editField.key,val)} onClose={()=>setEditField(null)}/>}
    </div>
  );
}

export default App;
