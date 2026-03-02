import React, { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

const C = {
  green:'#065f46', greenLight:'#d1fae5', greenMid:'#10b981',
  amber:'#92400e', amberLight:'#fef9c3', amberMid:'#f59e0b',
  blue:'#1d4ed8',  blueLight:'#eff6ff',  blueMid:'#3b82f6',
  red:'#991b1b',   redLight:'#fee2e2',   redMid:'#ef4444',
  purple:'#5b21b6',purpleLight:'#f5f3ff',purpleMid:'#7c3aed',
  gray:'#374151',  grayLight:'#f9fafb',  grayMid:'#9ca3af', border:'#e5e7eb',
};

const fmt     = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtTime = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—';
const daysUntil = d => d ? Math.ceil((new Date(d)-Date.now())/86400000) : null;

const Badge = ({ status }) => {
  const M = {
    pending:         {bg:C.amberLight,  color:C.amber,  label:'⏳ Awaiting Claim'},
    claimed:         {bg:C.blueLight,   color:C.blue,   label:'🔒 Claimed'},
    in_verification: {bg:'#f5f3ff',     color:C.purple, label:'🔍 In Verification'},
    approved:        {bg:C.greenLight,  color:C.green,  label:'✅ Approved'},
    rejected:        {bg:C.redLight,    color:C.red,    label:'❌ Rejected'},
  };
  const s = M[status] || M.pending;
  return <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:s.bg,color:s.color,whiteSpace:'nowrap'}}>{s.label}</span>;
};

const ExpiryChip = ({ date }) => {
  const d = daysUntil(date); if(d===null) return null;
  const [bg,color] = d<0?[C.redLight,C.red]:d<=3?['#fff7ed','#9a3412']:d<=7?[C.amberLight,C.amber]:[C.greenLight,C.green];
  return <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:700,background:bg,color}}>{d<0?`Expired ${Math.abs(d)}d ago`:d===0?'Expires today':`Expires in ${d}d`}</span>;
};

const InfoItem = ({label,value}) => (
  <div><div style={{color:C.grayMid,fontSize:'11px'}}>{label}</div><div style={{fontWeight:600,fontSize:'13px',color:C.gray}}>{value}</div></div>
);

const Overlay = ({children,onClose,maxW='620px'}) => (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}} onClick={onClose}>
    <div style={{background:'#fff',borderRadius:'16px',padding:'28px',maxWidth:maxW,width:'100%',maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
      {children}
    </div>
  </div>
);

const MHead = ({title,onClose,color=C.gray}) => (
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
    <h2 style={{margin:0,color,fontSize:'18px'}}>{title}</h2>
    <button onClick={onClose} style={{background:'none',border:'none',fontSize:'22px',cursor:'pointer',color:C.grayMid,lineHeight:1}}>✕</button>
  </div>
);

const CropBanner = ({crop}) => (
  <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:'10px',padding:'12px 16px',marginBottom:'18px'}}>
    <p style={{margin:'0 0 3px',fontWeight:700,fontSize:'15px',color:C.gray}}>{crop.varietySpecies} <span style={{fontWeight:400,color:C.grayMid}}>— {crop.productType}</span></p>
    <p style={{margin:0,fontSize:'12px',color:C.grayMid}}>
      Farmer: {crop.farmer.name} &nbsp;·&nbsp; {crop.harvestQuantity} {crop.unitOfSale} &nbsp;·&nbsp; ₹{crop.targetPrice}/{crop.unitOfSale}
      {crop.farmer.farmLocation && <> &nbsp;·&nbsp; 📍 {crop.farmer.farmLocation}</>}
    </p>
  </div>
);

const ImgPrev = ({previews}) => previews.length===0?null:(
  <div style={{display:'flex',gap:'8px',marginTop:'10px',flexWrap:'wrap'}}>
    {previews.map((p,i)=><img key={i} src={p} alt="" style={{width:'72px',height:'72px',objectFit:'cover',borderRadius:'8px',border:`2px solid ${C.greenMid}`}}/>)}
  </div>
);

const Err = ({msg}) => <div style={{background:C.redLight,color:C.red,padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px'}}>{msg}</div>;

const I_STYLE = {width:'100%',padding:'9px 12px',borderRadius:'8px',border:`1px solid ${C.border}`,boxSizing:'border-box',fontSize:'14px'};
const L_STYLE = {fontWeight:600,display:'block',marginBottom:'5px',fontSize:'13px',color:C.gray};

const EmptyState = ({icon,title,subtitle}) => (
  <div style={{textAlign:'center',padding:'60px 20px',color:C.grayMid,background:'#fff',borderRadius:'14px',border:`1px solid ${C.border}`}}>
    <div style={{fontSize:'48px',marginBottom:'10px'}}>{icon}</div>
    <div style={{fontSize:'16px',fontWeight:700,color:C.gray,marginBottom:'6px'}}>{title}</div>
    {subtitle&&<div style={{fontSize:'13px'}}>{subtitle}</div>}
  </div>
);

// ── APPROVE MODAL ─────────────────────────────────────────────────────────────
const ApproveModal = ({crop,onClose,onDone}) => {
  const [pImgs,setPImgs]=useState([]); const [pPrev,setPPrev]=useState([]);
  const [fImgs,setFImgs]=useState([]); const [fPrev,setFPrev]=useState([]);
  const [form,setForm]=useState({grade:'',pesticidesUsed:'',storageCondition:'',harvestCondition:'',verifiedQuantity:crop.harvestQuantity||'',remarks:'',expiryDate:''});
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}));
  const onPI=e=>{const f=Array.from(e.target.files);setPImgs(f);setPPrev(f.map(x=>URL.createObjectURL(x)));};
  const onFI=e=>{const f=Array.from(e.target.files);setFImgs(f);setFPrev(f.map(x=>URL.createObjectURL(x)));};

  const submit=async e=>{
    e.preventDefault();
    if(!pImgs.length){setError('At least one product image is required.');return;}
    if(!form.grade){setError('Quality grade is required.');return;}
    setLoading(true);setError('');
    try{
      const fd=new FormData();
      pImgs.forEach(f=>fd.append('images',f));
      fImgs.forEach(f=>fd.append('fieldImages',f));
      Object.entries(form).forEach(([k,v])=>{if(v)fd.append(k,v);});
      await api.put(`/representative/approve/${crop.farmer.email}/${crop.cropId}`,fd,{headers:{'Content-Type':'multipart/form-data'}});
      onDone();onClose();
    }catch(err){setError(err.response?.data?.msg||'Approval failed');}
    finally{setLoading(false);}
  };

  return (
    <Overlay onClose={onClose} maxW="660px">
      <MHead title="✅ Approve & Complete Inspection" onClose={onClose} color={C.green}/>
      <CropBanner crop={crop}/>
      <form onSubmit={submit}>
        <div style={{marginBottom:'14px'}}>
          <label style={L_STYLE}>Product Images * <span style={{color:C.grayMid,fontWeight:400}}>(up to 5 photos of the produce)</span></label>
          <input type="file" accept="image/*" multiple onChange={onPI} style={{...I_STYLE,padding:'7px'}}/>
          <ImgPrev previews={pPrev}/>
        </div>
        <div style={{marginBottom:'14px'}}>
          <label style={L_STYLE}>Field / Farm Images <span style={{color:C.grayMid,fontWeight:400}}>(optional)</span></label>
          <input type="file" accept="image/*" multiple onChange={onFI} style={{...I_STYLE,padding:'7px'}}/>
          <ImgPrev previews={fPrev}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
          <div>
            <label style={L_STYLE}>Quality Grade *</label>
            <select value={form.grade} onChange={e=>sf('grade',e.target.value)} style={I_STYLE} required>
              <option value="">Select</option>
              <option value="A">Grade A — Premium</option>
              <option value="B">Grade B — Good</option>
              <option value="C">Grade C — Average</option>
              <option value="D">Grade D — Below Average</option>
            </select>
          </div>
          <div>
            <label style={L_STYLE}>Verified Quantity</label>
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <input type="number" value={form.verifiedQuantity} onChange={e=>sf('verifiedQuantity',e.target.value)} style={{...I_STYLE,flex:1}} min="0"/>
              <span style={{color:C.grayMid,fontSize:'13px',whiteSpace:'nowrap'}}>{crop.unitOfSale}</span>
            </div>
          </div>
          <div>
            <label style={L_STYLE}>Expiry / Best Before Date</label>
            <input type="date" value={form.expiryDate} onChange={e=>sf('expiryDate',e.target.value)} style={I_STYLE}/>
          </div>
          <div>
            <label style={L_STYLE}>Harvest Condition</label>
            <input type="text" value={form.harvestCondition} onChange={e=>sf('harvestCondition',e.target.value)} placeholder="Fresh / Good / Fair" style={I_STYLE}/>
          </div>
        </div>
        <div style={{marginBottom:'12px'}}>
          <label style={L_STYLE}>Pesticides / Chemicals Used</label>
          <input type="text" value={form.pesticidesUsed} onChange={e=>sf('pesticidesUsed',e.target.value)} placeholder="None / Last spray 30d ago / Details" style={I_STYLE}/>
        </div>
        <div style={{marginBottom:'12px'}}>
          <label style={L_STYLE}>Storage Condition</label>
          <input type="text" value={form.storageCondition} onChange={e=>sf('storageCondition',e.target.value)} placeholder="Dry warehouse / Cold storage 4°C" style={I_STYLE}/>
        </div>
        <div style={{marginBottom:'18px'}}>
          <label style={L_STYLE}>Inspection Remarks</label>
          <textarea value={form.remarks} onChange={e=>sf('remarks',e.target.value)} rows={3} placeholder="General observations, special notes..." style={{...I_STYLE,resize:'vertical'}}/>
        </div>
        {error&&<Err msg={error}/>}
        <div style={{display:'flex',gap:'10px'}}>
          <button type="submit" disabled={loading} style={{flex:1,padding:'12px',background:loading?C.grayMid:C.greenMid,color:'#fff',border:'none',borderRadius:'10px',fontWeight:700,fontSize:'15px',cursor:loading?'not-allowed':'pointer'}}>
            {loading?'Uploading & Approving...':'✅ Approve & Publish Listing'}
          </button>
          <button type="button" onClick={onClose} style={{padding:'12px 20px',background:'#f3f4f6',color:C.gray,border:'none',borderRadius:'10px',fontWeight:600,cursor:'pointer'}}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
};

// ── REJECT MODAL ──────────────────────────────────────────────────────────────
const RejectModal = ({crop,onClose,onDone}) => {
  const [reason,setReason]=useState(''); const [loading,setLoading]=useState(false);
  const submit=async()=>{
    setLoading(true);
    try{await api.put(`/representative/reject/${crop.farmer.email}/${crop.cropId}`,{reason});onDone();onClose();}
    catch(err){alert(err.response?.data?.msg||'Failed');}
    finally{setLoading(false);}
  };
  return (
    <Overlay onClose={onClose} maxW="460px">
      <MHead title="❌ Reject Product" onClose={onClose} color={C.red}/>
      <p style={{color:C.grayMid,marginBottom:'16px',fontSize:'14px'}}>Rejecting <strong style={{color:C.gray}}>{crop.varietySpecies}</strong> by {crop.farmer.name}. Farmer will be notified and can resubmit.</p>
      <label style={{...L_STYLE}}>Reason for Rejection</label>
      <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={4} placeholder="e.g., Quality below standard, quantity mismatch, pest infestation..."
        style={{width:'100%',padding:'10px',borderRadius:'8px',border:`1px solid ${C.border}`,resize:'vertical',marginBottom:'18px',boxSizing:'border-box',fontSize:'14px'}}/>
      <div style={{display:'flex',gap:'10px'}}>
        <button onClick={submit} disabled={loading} style={{flex:1,padding:'11px',background:loading?C.grayMid:C.redMid,color:'#fff',border:'none',borderRadius:'10px',fontWeight:700,cursor:loading?'not-allowed':'pointer'}}>
          {loading?'Rejecting...':'❌ Confirm Rejection'}
        </button>
        <button onClick={onClose} style={{padding:'11px 20px',background:'#f3f4f6',color:C.gray,border:'none',borderRadius:'10px',fontWeight:600,cursor:'pointer'}}>Cancel</button>
      </div>
    </Overlay>
  );
};

// ── SAVE NOTES MODAL ──────────────────────────────────────────────────────────
const EditVerifModal = ({crop,onClose,onDone}) => {
  const [form,setForm]=useState({
    verifiedQuantity:crop.qualityReport?.verifiedQuantity||crop.harvestQuantity||'',
    harvestCondition:crop.qualityReport?.harvestCondition||'',
    pesticidesUsed:crop.qualityReport?.pesticidesUsed||'',
    storageCondition:crop.qualityReport?.storageCondition||'',
    remarks:crop.qualityReport?.remarks||'',
  });
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}));

  const submit=async e=>{
    e.preventDefault();setLoading(true);setError('');
    try{await api.put(`/representative/edit/${crop.farmer.email}/${crop.cropId}`,form);onDone();onClose();}
    catch(err){setError(err.response?.data?.msg||'Failed');}
    finally{setLoading(false);}
  };

  return (
    <Overlay onClose={onClose} maxW="520px">
      <MHead title="📝 Save Field Notes" onClose={onClose} color={C.blue}/>
      <CropBanner crop={crop}/>
      <form onSubmit={submit}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
          <div>
            <label style={L_STYLE}>Verified Quantity</label>
            <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
              <input type="number" value={form.verifiedQuantity} onChange={e=>sf('verifiedQuantity',e.target.value)} style={{...I_STYLE,flex:1}}/>
              <span style={{color:C.grayMid,fontSize:'13px'}}>{crop.unitOfSale}</span>
            </div>
          </div>
          <div>
            <label style={L_STYLE}>Harvest Condition</label>
            <input type="text" value={form.harvestCondition} onChange={e=>sf('harvestCondition',e.target.value)} placeholder="Fresh / Good / Fair" style={I_STYLE}/>
          </div>
          <div>
            <label style={L_STYLE}>Pesticides Used</label>
            <input type="text" value={form.pesticidesUsed} onChange={e=>sf('pesticidesUsed',e.target.value)} placeholder="None / Details..." style={I_STYLE}/>
          </div>
          <div>
            <label style={L_STYLE}>Storage Condition</label>
            <input type="text" value={form.storageCondition} onChange={e=>sf('storageCondition',e.target.value)} placeholder="Dry / Cold / Ambient" style={I_STYLE}/>
          </div>
        </div>
        <div style={{marginBottom:'16px'}}>
          <label style={L_STYLE}>Field Notes / Remarks</label>
          <textarea value={form.remarks} onChange={e=>sf('remarks',e.target.value)} rows={3} placeholder="Observations from on-field visit..." style={{...I_STYLE,resize:'vertical'}}/>
        </div>
        {error&&<Err msg={error}/>}
        <div style={{display:'flex',gap:'10px'}}>
          <button type="submit" disabled={loading} style={{flex:1,padding:'11px',background:loading?C.grayMid:C.blueMid,color:'#fff',border:'none',borderRadius:'10px',fontWeight:700,cursor:loading?'not-allowed':'pointer'}}>
            {loading?'Saving...':'💾 Save Notes'}
          </button>
          <button type="button" onClick={onClose} style={{padding:'11px 20px',background:'#f3f4f6',color:C.gray,border:'none',borderRadius:'10px',fontWeight:600,cursor:'pointer'}}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
};

// ── POST-APPROVAL EDIT MODAL ──────────────────────────────────────────────────
const PostApprovalModal = ({crop,onClose,onDone}) => {
  const [form,setForm]=useState({
    expiryDate:crop.expiryDate?new Date(crop.expiryDate).toISOString().split('T')[0]:'',
    remarks:crop.qualityReport?.remarks||'',
    deactivate:false,
  });
  const [loading,setLoading]=useState(false);
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}));
  const submit=async e=>{
    e.preventDefault();setLoading(true);
    try{await api.put(`/representative/admin-edit/${crop.farmer.email}/${crop.cropId}`,form);onDone();onClose();}
    catch(err){alert(err.response?.data?.msg||'Failed');}
    finally{setLoading(false);}
  };
  return (
    <Overlay onClose={onClose} maxW="460px">
      <MHead title="⚙️ Edit Approved Listing" onClose={onClose} color={C.purple}/>
      <div style={{fontSize:'12px',color:C.grayMid,marginBottom:'14px',background:'#f5f3ff',padding:'8px 12px',borderRadius:'8px'}}>
        Limited edits only. Major changes (price, identity, quantity) require re-verification.
      </div>
      <CropBanner crop={crop}/>
      <form onSubmit={submit}>
        <div style={{marginBottom:'12px'}}>
          <label style={L_STYLE}>Update Expiry Date</label>
          <input type="date" value={form.expiryDate} onChange={e=>sf('expiryDate',e.target.value)} style={I_STYLE}/>
        </div>
        <div style={{marginBottom:'14px'}}>
          <label style={L_STYLE}>Update Remarks</label>
          <textarea value={form.remarks} onChange={e=>sf('remarks',e.target.value)} rows={3} style={{...I_STYLE,resize:'vertical'}}/>
        </div>
        <label style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'18px',cursor:'pointer',fontSize:'13px',color:C.red,fontWeight:600}}>
          <input type="checkbox" checked={form.deactivate} onChange={e=>sf('deactivate',e.target.checked)}/>
          Deactivate this listing (hide from dealers)
        </label>
        <div style={{display:'flex',gap:'10px'}}>
          <button type="submit" disabled={loading} style={{flex:1,padding:'11px',background:loading?C.grayMid:C.purpleMid,color:'#fff',border:'none',borderRadius:'10px',fontWeight:700,cursor:loading?'not-allowed':'pointer'}}>
            {loading?'Saving...':'💾 Save Changes'}
          </button>
          <button type="button" onClick={onClose} style={{padding:'11px 20px',background:'#f3f4f6',color:C.gray,border:'none',borderRadius:'10px',fontWeight:600,cursor:'pointer'}}>Cancel</button>
        </div>
      </form>
    </Overlay>
  );
};

// ── BATCH CARD (unassigned queue) ─────────────────────────────────────────────
const BatchCard = ({batch,onRefresh}) => {
  const [claiming,setClaiming]=useState(false);
  const claim=async()=>{
    setClaiming(true);
    try{await api.post(`/representative/claim/${batch.batchId}`);onRefresh();}
    catch(err){alert(err.response?.data?.msg||'Failed to claim. Try refreshing.');}
    finally{setClaiming(false);}
  };
  return (
    <div style={{background:'#fff',border:`1px solid ${C.border}`,borderRadius:'14px',padding:'20px',display:'flex',flexDirection:'column',gap:'14px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'10px'}}>
        <div>
          <div style={{fontWeight:700,fontSize:'14px',color:C.gray}}>👨‍🌾 {batch.farmer.name}</div>
          <div style={{fontSize:'12px',color:C.grayMid,marginTop:'2px'}}>📞 {batch.farmer.mobile} &nbsp;·&nbsp; {batch.farmer.email}</div>
          {batch.farmer.farmLocation&&<div style={{fontSize:'12px',color:C.grayMid,marginTop:'2px'}}>📍 {batch.farmer.farmLocation}</div>}
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <Badge status="pending"/>
          <div style={{fontSize:'11px',color:C.grayMid,marginTop:'4px'}}>{fmtTime(batch.submittedAt)}</div>
        </div>
      </div>
      {/* Crops table */}
      <div style={{border:`1px solid ${C.border}`,borderRadius:'10px',overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',padding:'8px 12px',background:C.green,color:'#fff',fontSize:'11px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px'}}>
          <div>Crop / Variety</div><div>Qty</div><div>Target Price</div><div>Harvest Date</div>
        </div>
        {batch.crops.map((c,i)=>(
          <div key={c.cropId} style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',padding:'10px 12px',borderTop:i>0?`1px solid ${C.border}`:'none',fontSize:'13px'}}>
            <div><div style={{fontWeight:600,color:C.gray}}>{c.varietySpecies}</div><div style={{fontSize:'11px',color:C.grayMid}}>{c.productType}</div></div>
            <div style={{color:C.gray}}>{c.harvestQuantity} {c.unitOfSale}</div>
            <div style={{color:C.green,fontWeight:600}}>₹{c.targetPrice}/{c.unitOfSale}</div>
            <div style={{color:C.grayMid}}>{fmt(c.harvestDate)}</div>
          </div>
        ))}
      </div>
      {batch.crops[0]?.additionalNotes&&(
        <div style={{fontSize:'12px',color:C.amber,background:C.amberLight,padding:'8px 12px',borderRadius:'8px',borderLeft:`3px solid ${C.amberMid}`}}>
          <strong>Farmer note:</strong> {batch.crops[0].additionalNotes}
        </div>
      )}
      <button onClick={claim} disabled={claiming}
        style={{width:'100%',padding:'11px',background:claiming?C.grayMid:C.greenMid,color:'#fff',border:'none',borderRadius:'10px',fontWeight:700,fontSize:'14px',cursor:claiming?'not-allowed':'pointer'}}>
        {claiming?'Claiming...':`🔒 Claim & Start Verification (${batch.crops.length} crop${batch.crops.length>1?'s':''})`}
      </button>
    </div>
  );
};

// ── ASSIGNED BATCH CARD (My Verifications) ────────────────────────────────────
const AssignedCard = ({batch,onRefresh}) => {
  const [approveModal,setApproveModal]=useState(null);
  const [rejectModal,setRejectModal]=useState(null);
  const [editModal,setEditModal]=useState(null);
  const [unclaiming,setUnclaiming]=useState(false);

  const unclaim=async()=>{
    if(!window.confirm('Release this batch back to the queue?'))return;
    setUnclaiming(true);
    try{await api.post(`/representative/unclaim/${batch.batchId}`);onRefresh();}
    catch(err){alert(err.response?.data?.msg||'Failed');}
    finally{setUnclaiming(false);}
  };

  const anyInVerif=batch.crops.some(c=>c.verificationStatus==='in_verification');

  return (
    <div style={{background:'#fff',border:`2px solid ${C.blueMid}`,borderRadius:'14px',padding:'20px',display:'flex',flexDirection:'column',gap:'14px',boxShadow:'0 2px 8px rgba(59,130,246,0.1)'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'10px'}}>
        <div>
          <div style={{fontWeight:700,fontSize:'14px',color:C.gray}}>👨‍🌾 {batch.farmer.name}</div>
          <div style={{fontSize:'12px',color:C.grayMid,marginTop:'2px'}}>📞 {batch.farmer.mobile} &nbsp;·&nbsp; 📍 {batch.farmer.farmLocation||'Location not set'}</div>
          <div style={{fontSize:'12px',color:C.grayMid,marginTop:'2px'}}>Claimed {fmtTime(batch.crops[0]?.claimedAt)}</div>
        </div>
        <Badge status={anyInVerif?'in_verification':'claimed'}/>
      </div>

      {batch.crops.map(crop=>(
        <div key={crop.cropId} style={{border:`1px solid ${C.border}`,borderRadius:'10px',overflow:'hidden'}}>
          <div style={{padding:'10px 14px',background:C.blueLight,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>
              <span style={{fontWeight:700,fontSize:'14px',color:C.blue}}>{crop.varietySpecies}</span>
              <span style={{marginLeft:'8px',fontSize:'11px',background:C.blueMid,color:'#fff',padding:'1px 8px',borderRadius:'10px'}}>{crop.productType}</span>
            </div>
            <Badge status={crop.verificationStatus}/>
          </div>
          <div style={{padding:'12px 14px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
            <InfoItem label="Submitted Qty" value={`${crop.harvestQuantity} ${crop.unitOfSale}`}/>
            <InfoItem label="Target Price" value={`₹${crop.targetPrice}/${crop.unitOfSale}`}/>
            <InfoItem label="Harvest Date" value={fmt(crop.harvestDate)}/>
            {crop.qualityReport?.verifiedQuantity&&<InfoItem label="Verified Qty" value={`${crop.qualityReport.verifiedQuantity} ${crop.unitOfSale}`}/>}
            {crop.qualityReport?.harvestCondition&&<InfoItem label="Condition" value={crop.qualityReport.harvestCondition}/>}
            {crop.qualityReport?.remarks&&<div style={{gridColumn:'1/-1'}}><span style={{color:C.grayMid,fontSize:'11px'}}>Notes</span><div style={{fontSize:'13px',color:C.gray,fontStyle:'italic'}}>{crop.qualityReport.remarks}</div></div>}
          </div>
          <div style={{padding:'10px 14px',borderTop:`1px solid ${C.border}`,display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button onClick={()=>setEditModal(crop)} style={{padding:'7px 14px',background:C.blueLight,color:C.blue,border:`1px solid ${C.blueMid}`,borderRadius:'8px',fontWeight:600,cursor:'pointer',fontSize:'12px'}}>📝 Save Notes</button>
            <button onClick={()=>setApproveModal(crop)} style={{padding:'7px 14px',background:C.greenLight,color:C.green,border:`1px solid ${C.greenMid}`,borderRadius:'8px',fontWeight:600,cursor:'pointer',fontSize:'12px'}}>✅ Approve</button>
            <button onClick={()=>setRejectModal(crop)} style={{padding:'7px 14px',background:C.redLight,color:C.red,border:`1px solid ${C.redMid}`,borderRadius:'8px',fontWeight:600,cursor:'pointer',fontSize:'12px'}}>❌ Reject</button>
          </div>
        </div>
      ))}

      <button onClick={unclaim} disabled={unclaiming} style={{padding:'9px',background:'#f3f4f6',color:C.grayMid,border:`1px solid ${C.border}`,borderRadius:'8px',fontWeight:600,cursor:unclaiming?'not-allowed':'pointer',fontSize:'12px'}}>
        {unclaiming?'Releasing...':'↩ Release Back to Queue'}
      </button>

      {approveModal&&<ApproveModal crop={approveModal} onClose={()=>setApproveModal(null)} onDone={onRefresh}/>}
      {rejectModal&&<RejectModal crop={rejectModal} onClose={()=>setRejectModal(null)} onDone={onRefresh}/>}
      {editModal&&<EditVerifModal crop={editModal} onClose={()=>setEditModal(null)} onDone={onRefresh}/>}
    </div>
  );
};

// ── APPROVED PRODUCT CARD ─────────────────────────────────────────────────────
const ApprovedCard = ({crop,onRefresh}) => {
  const [modal,setModal]=useState(false);
  return (
    <div style={{background:'#fff',border:`1px solid ${daysUntil(crop.expiryDate)<=7?C.amberMid:'#bbf7d0'}`,borderRadius:'14px',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.05)'}}>
      {crop.imageUrl
        ?<img src={crop.imageUrl} alt={crop.varietySpecies} style={{width:'100%',height:'160px',objectFit:'cover'}}/>
        :<div style={{height:'80px',background:C.greenLight,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'28px'}}>🌾</div>
      }
      <div style={{padding:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px'}}>
          <div>
            <div style={{fontWeight:700,fontSize:'15px',color:C.gray}}>{crop.varietySpecies}</div>
            <div style={{fontSize:'12px',color:C.grayMid}}>{crop.productType} · {crop.farmer.name}</div>
          </div>
          <Badge status="approved"/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'10px'}}>
          <InfoItem label="Quantity" value={`${crop.harvestQuantity} ${crop.unitOfSale}`}/>
          <InfoItem label="Price" value={`₹${crop.targetPrice}/${crop.unitOfSale}`}/>
          {crop.qualityReport?.grade&&<InfoItem label="Grade" value={`Grade ${crop.qualityReport.grade}`}/>}
          {crop.qualityReport?.verifiedQuantity&&<InfoItem label="Verified Qty" value={`${crop.qualityReport.verifiedQuantity} ${crop.unitOfSale}`}/>}
        </div>
        {crop.expiryDate&&<div style={{marginBottom:'10px'}}><ExpiryChip date={crop.expiryDate}/> <span style={{fontSize:'11px',color:C.grayMid,marginLeft:'6px'}}>{fmt(crop.expiryDate)}</span></div>}
        {crop.qualityReport?.remarks&&<div style={{fontSize:'12px',color:C.grayMid,background:C.grayLight,padding:'7px 10px',borderRadius:'6px',marginBottom:'10px'}}>{crop.qualityReport.remarks}</div>}
        {crop.fieldImages?.length>0&&(
          <div style={{display:'flex',gap:'6px',marginBottom:'10px',flexWrap:'wrap'}}>
            {crop.fieldImages.map((img,i)=><img key={i} src={img} alt="" style={{width:'50px',height:'50px',objectFit:'cover',borderRadius:'6px',border:`1px solid ${C.border}`}}/>)}
          </div>
        )}
        <button onClick={()=>setModal(true)} style={{width:'100%',padding:'8px',background:'#f5f3ff',color:C.purple,border:`1px solid ${C.purpleMid}`,borderRadius:'8px',fontWeight:600,cursor:'pointer',fontSize:'12px'}}>
          ⚙️ Edit Expiry / Remarks
        </button>
      </div>
      {modal&&<PostApprovalModal crop={crop} onClose={()=>setModal(false)} onDone={onRefresh}/>}
    </div>
  );
};

// ── MAIN ──────────────────────────────────────────────────────────────────────
const RepresentativeDashboard = () => {
  const {user,logout}=useAuth(); const navigate=useNavigate();
  const [tab,setTab]=useState('queue');
  const [queue,setQueue]=useState([]);
  const [mine,setMine]=useState([]);
  const [approved,setApproved]=useState([]);
  const [rejected,setRejected]=useState([]);
  const [alerts,setAlerts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const [q,m,a,r,e]=await Promise.all([
        api.get('/representative/pending'),
        api.get('/representative/my-assigned'),
        api.get('/representative/crops?status=approved'),
        api.get('/representative/crops?status=rejected'),
        api.get('/representative/expiry-alerts?days=14'),
      ]);
      setQueue(q.data);setMine(m.data);setApproved(a.data);setRejected(r.data);setAlerts(e.data);
    }catch(err){setError(err.response?.data?.msg||'Failed to load data');}
    finally{setLoading(false);}
  },[]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{const id=setInterval(load,30000);return()=>clearInterval(id);},[load]);

  const signout=()=>{if(window.confirm('Sign out?')){logout();navigate('/login');}};

  const TABS=[
    {k:'queue', label:`📋 Unassigned Queue`,  n:queue.reduce((s,b)=>s+b.crops.length,0)},
    {k:'mine',  label:`🔍 My Verifications`,  n:mine.reduce((s,b)=>s+b.crops.length,0)},
    {k:'approved',label:`✅ Approved`,         n:approved.length},
    {k:'rejected',label:`❌ Rejected`,         n:rejected.length},
  ];

  const tS=k=>({padding:'9px 16px',border:'none',borderRadius:'8px',fontWeight:700,fontSize:'13px',cursor:'pointer',background:tab===k?C.greenMid:'#f3f4f6',color:tab===k?'#fff':C.gray,transition:'background 0.15s'});

  return (
    <div style={{minHeight:'100vh',background:C.grayLight,fontFamily:"'Segoe UI',sans-serif"}}>
      {/* Navbar */}
      <nav style={{background:C.green,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:'60px',boxShadow:'0 2px 8px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <img src="https://ik.imagekit.io/a2wpi1kd9/imgToUrl/image-to-url_ThyEiMVLh" alt="logo" style={{height:'36px'}}/>
          <span style={{color:'#fff',fontWeight:700,fontSize:'18px'}}>Agro<span style={{color:'#6ee7b7'}}>Chain</span><span style={{background:'#6ee7b7',color:C.green,fontSize:'10px',fontWeight:800,padding:'2px 8px',borderRadius:'10px',marginLeft:'10px',verticalAlign:'middle'}}>REP</span></span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
          {alerts.length>0&&<button onClick={()=>setTab('approved')} style={{background:'#92400e',color:'#fef9c3',border:'none',padding:'6px 12px',borderRadius:'20px',cursor:'pointer',fontWeight:700,fontSize:'12px'}}>⚠️ {alerts.length} Expiring Soon</button>}
          <span style={{color:'#a7f3d0',fontSize:'13px'}}>👤 {user?.firstName||'Representative'}</span>
          <button onClick={signout} style={{background:C.redMid,color:'#fff',border:'none',padding:'8px 14px',borderRadius:'8px',cursor:'pointer',fontWeight:600,fontSize:'13px'}}>🚪 Sign Out</button>
        </div>
      </nav>

      <div style={{maxWidth:'1140px',margin:'0 auto',padding:'24px 20px'}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'14px',marginBottom:'24px'}}>
          {[
            {l:'Unassigned',   v:queue.reduce((s,b)=>s+b.crops.length,0),   c:C.amberMid, bg:C.amberLight},
            {l:'My Active',    v:mine.reduce((s,b)=>s+b.crops.length,0),    c:C.blueMid,  bg:C.blueLight},
            {l:'Approved',     v:approved.length,                            c:C.greenMid, bg:C.greenLight},
            {l:'Expiring ≤14d',v:alerts.length,                              c:C.amberMid, bg:'#fff7ed'},
          ].map(s=>(
            <div key={s.l} style={{background:s.bg,border:`1px solid ${s.c}40`,borderRadius:'12px',padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:'28px',fontWeight:800,color:s.c}}>{s.v}</div>
              <div style={{fontSize:'12px',color:C.gray,fontWeight:600,marginTop:'2px'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap',alignItems:'center'}}>
          {TABS.map(t=>(
            <button key={t.k} style={tS(t.k)} onClick={()=>setTab(t.k)}>
              {t.label}{t.n>0&&<span style={{marginLeft:'6px',background:'rgba(255,255,255,0.3)',borderRadius:'10px',padding:'1px 7px',fontSize:'11px'}}>{t.n}</span>}
            </button>
          ))}
          <button onClick={load} style={{marginLeft:'auto',padding:'9px 16px',background:C.blueLight,color:C.blue,border:`1px solid #bfdbfe`,borderRadius:'8px',fontWeight:600,cursor:'pointer',fontSize:'12px'}}>🔄 Refresh</button>
        </div>

        {error&&<div style={{background:C.redLight,color:C.red,padding:'12px',borderRadius:'10px',marginBottom:'18px'}}>{error}</div>}
        {loading&&<div style={{textAlign:'center',padding:'60px',color:C.grayMid,fontSize:'16px'}}>Loading…</div>}

        {/* Queue */}
        {!loading&&tab==='queue'&&(
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
              <h2 style={{margin:0,color:C.gray,fontSize:'18px'}}>📋 Unassigned Verification Requests</h2>
              <span style={{fontSize:'13px',color:C.grayMid}}>Claim a batch to begin physical verification</span>
            </div>
            {queue.length===0?<EmptyState icon="🎉" title="All caught up!" subtitle="No pending verification requests at this time."/>
              :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(480px,1fr))',gap:'16px'}}>
                {queue.map(b=><BatchCard key={b.batchId} batch={b} onRefresh={load}/>)}
              </div>}
          </>
        )}

        {/* Mine */}
        {!loading&&tab==='mine'&&(
          <>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
              <h2 style={{margin:0,color:C.gray,fontSize:'18px'}}>🔍 My Assigned Verifications</h2>
              <span style={{fontSize:'13px',color:C.grayMid}}>Visit farmer → complete inspection → approve or reject</span>
            </div>
            {mine.length===0?<EmptyState icon="📋" title="No active verifications" subtitle="Claim a request from the queue to get started."/>
              :<div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                {mine.map(b=><AssignedCard key={b.batchId} batch={b} onRefresh={load}/>)}
              </div>}
          </>
        )}

        {/* Approved */}
        {!loading&&tab==='approved'&&(
          <>
            <h2 style={{margin:'0 0 16px',color:C.gray,fontSize:'18px'}}>✅ Approved Verified Listings</h2>
            {alerts.length>0&&(
              <div style={{background:'#fff7ed',border:`1px solid ${C.amberMid}`,borderRadius:'12px',padding:'14px 18px',marginBottom:'18px'}}>
                <div style={{fontWeight:700,color:'#9a3412',marginBottom:'8px',fontSize:'14px'}}>⚠️ {alerts.length} product(s) expiring within 14 days</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                  {alerts.map(c=><div key={c.cropId} style={{background:'#fff',border:`1px solid ${C.amberMid}`,borderRadius:'8px',padding:'6px 12px',fontSize:'12px'}}><strong>{c.varietySpecies}</strong> — {c.farmer.name} <ExpiryChip date={c.expiryDate}/></div>)}
                </div>
              </div>
            )}
            {approved.length===0?<EmptyState icon="🌾" title="No approved products yet" subtitle="Approved products will appear here."/>
              :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'16px'}}>
                {approved.map(c=><ApprovedCard key={c.cropId} crop={c} onRefresh={load}/>)}
              </div>}
          </>
        )}

        {/* Rejected */}
        {!loading&&tab==='rejected'&&(
          <>
            <h2 style={{margin:'0 0 16px',color:C.gray,fontSize:'18px'}}>❌ Rejected Submissions</h2>
            {rejected.length===0?<EmptyState icon="✅" title="No rejected products" subtitle="Rejected submissions appear here."/>
              :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:'14px'}}>
                {rejected.map(c=>(
                  <div key={c.cropId} style={{background:'#fff',border:'1px solid #fca5a5',borderRadius:'12px',padding:'18px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px'}}>
                      <div><div style={{fontWeight:700,fontSize:'14px',color:C.gray}}>{c.varietySpecies}</div><div style={{fontSize:'12px',color:C.grayMid}}>{c.productType} · {c.farmer.name}</div></div>
                      <Badge status="rejected"/>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',fontSize:'12px',marginBottom:'10px'}}>
                      <InfoItem label="Quantity" value={`${c.harvestQuantity} ${c.unitOfSale}`}/>
                      <InfoItem label="Rejected on" value={fmt(c.lastUpdated)}/>
                    </div>
                    {c.qualityReport?.remarks&&<div style={{background:C.redLight,color:C.red,padding:'8px 12px',borderRadius:'8px',fontSize:'12px'}}>{c.qualityReport.remarks}</div>}
                  </div>
                ))}
              </div>}
          </>
        )}
      </div>
    </div>
  );
};

export default RepresentativeDashboard;