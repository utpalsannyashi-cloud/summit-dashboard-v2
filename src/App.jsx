import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { COLORS, STATUS_COLORS, SEED_VERTICALS, SEED_OFFICERS, SEED_TASKS } from './constants';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const BUBBLE_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#14B8A6','#84CC16','#6366F1'];
function getColorForName(name) {
  if (!name) return '#64748b';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BUBBLE_COLORS[Math.abs(hash) % BUBBLE_COLORS.length];
}

function makeTheme(isDark) {
  return isDark ? {
    bg:'#0f1117',surface:'#181c27',card:'#1e2235',border:'#2a3050',
    borderHover:'#3a4470',text:'#e8eaf6',muted:'#7b82a8',
    accent:'#3B82F6',accentGlow:'rgba(59,130,246,0.15)',inputBg:'#0f1117',
    shadow:'0 1px 3px rgba(0,0,0,0.4)',
  } : {
    bg:'#f1f5f9',surface:'#fff',card:'#fff',border:'#e2e8f0',
    borderHover:'#94a3b8',text:'#1e293b',muted:'#64748b',
    accent:'#2563eb',accentGlow:'rgba(37,99,235,0.1)',inputBg:'#fff',
    shadow:'0 1px 3px rgba(0,0,0,0.08)',
  };
}

function ThemeToggle({ isDark, onToggle, t }) {
  return (
    <div onClick={onToggle} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none',color:t.muted}}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={!isDark?t.accent:'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
      </svg>
      <div style={{width:42,height:24,borderRadius:12,background:isDark?t.accent:'#cbd5e1',border:'1px solid '+t.border,position:'relative',transition:'background 0.2s',flexShrink:0}}>
        <div style={{width:18,height:18,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:isDark?20:2,transition:'left 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark?t.accent:'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    </div>
  );
}

function Modal({ t, onClose, children, danger=false }) {
  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose();}}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div onClick={e=>e.stopPropagation()}
        style={{background:t.card,border:`1px solid ${danger?'#ef4444':t.accent}`,borderRadius:16,padding:'2rem',width:'100%',maxWidth:480,maxHeight:'85vh',overflowY:'auto',boxShadow:'0 10px 40px rgba(0,0,0,0.5)'}}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ icon, title, subtitle, danger=false, t }) {
  return (
    <div style={{textAlign:'center',marginBottom:'1.5rem'}}>
      <div style={{width:52,height:52,borderRadius:'50%',background:danger?'rgba(239,68,68,0.1)':t.accentGlow,border:`1px solid ${danger?'#ef4444':t.accent}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:22}}>{icon}</div>
      <h3 style={{margin:'0 0 6px',fontSize:17,fontWeight:600,color:t.text}}>{title}</h3>
      {subtitle&&<p style={{margin:0,fontSize:13,color:t.muted}}>{subtitle}</p>}
    </div>
  );
}

const mkInp = t => ({
  fontSize:13,padding:'9px 11px',borderRadius:8,
  border:'1px solid '+t.border,background:t.inputBg,
  color:t.text,outline:'none',width:'100%',boxSizing:'border-box',
});

// ── Login Screen ──────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [isDark] = useState(true);
  const t = makeTheme(isDark);
  const inp = mkInp(t);
  const [mode, setMode] = useState('login');
  const [teamNameInput, setTeamNameInput] = useState('');
  const [pwInput, setPwInput] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ teamName:'', sitePw:'', adminPw:'', aiRulesPw:'' });
  const [createErr, setCreateErr] = useState('');
  const [changeForm, setChangeForm] = useState({teamName:'',currentPw:'',newPw:'',confirmPw:''});
  const [changeErr, setChangeErr] = useState('');
  const [changeOk, setChangeOk] = useState(false);

  const [superAdminUnlocked, setSuperAdminUnlocked] = useState(false);
  const [superPwInput, setSuperPwInput] = useState('');
  const [superErr, setSuperErr] = useState('');
  const [allTeams, setAllTeams] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);

  const handleLogin = async () => {
    if (!teamNameInput.trim()) { setPwErr('Enter your team name.'); return; }
    if (!pwInput.trim()) { setPwErr('Enter your team password.'); return; }
    setLoading(true); setPwErr('');
    const { data, error } = await supabase.from('teams').select('*').eq('team_name', teamNameInput.trim()).eq('site_password', pwInput.trim());
    setLoading(false);
    if (error || !data || data.length === 0) { setPwErr('Team name or password is incorrect.'); return; }
    onLogin(data[0]);
  };

  const handleChangePw = async () => { const {teamName,currentPw,newPw,confirmPw} = changeForm; if (!teamName.trim()||!currentPw.trim()||!newPw.trim()||!confirmPw.trim()) { setChangeErr('All fields are required.'); return; } if (newPw!==confirmPw) { setChangeErr('New passwords do not match.'); return; } if (newPw.length<4) { setChangeErr('Password must be at least 4 characters.'); return; } setLoading(true); setChangeErr(''); setChangeOk(false); const {data,error} = await supabase.from('teams').select('*').eq('team_name',teamName.trim()).eq('site_password',currentPw.trim()); if (error||!data||data.length===0) { setLoading(false); setChangeErr('Team name or current password is incorrect.'); return; } const {error:upErr} = await supabase.from('teams').update({site_password:newPw.trim()}).eq('team_name',teamName.trim()); setLoading(false); if (upErr) { setChangeErr('Failed to update. Try again.'); return; } setChangeOk(true); };

  const handleCreate = async () => {
    const { teamName, sitePw, adminPw, aiRulesPw } = createForm;
    if (!teamName.trim() || !sitePw.trim() || !adminPw.trim() || !aiRulesPw.trim()) {
      setCreateErr('All fields are required.'); return;
    }
    if (sitePw === adminPw || sitePw === aiRulesPw || adminPw === aiRulesPw) {
      setCreateErr('All three passwords must be different.'); return;
    }
    setLoading(true); setCreateErr('');
    const teamId = teamName.trim().toLowerCase().replace(/\s+/g,'_') + '_' + Date.now().toString(36);
    const { error } = await supabase.from('teams').insert({
      team_id: teamId, team_name: teamName.trim(),
      site_password: sitePw.trim(), admin_password: adminPw.trim(), ai_rules_password: aiRulesPw.trim(),
    });
    if (error) { setLoading(false); setCreateErr('Error: ' + error.message); return; }
    const { data } = await supabase.from('teams').select('*').eq('team_id', teamId).single();
    setLoading(false);
    if (data) onLogin(data);
  };

  const handleSuperLogin = async () => {
    if (superPwInput === 'master123') {
      setSuperErr('');
      setLoading(true);
      const { data, error } = await supabase.from('teams').select('*');
      setLoading(false);
      if (data) { setAllTeams(data); setSuperAdminUnlocked(true); }
      else setSuperErr('Failed to load teams. Check Supabase connection.');
    } else {
      setSuperErr('Incorrect master password.');
    }
  };

  const handleSuperLogout = () => {
    setSuperAdminUnlocked(false); setSuperPwInput(''); setAllTeams([]); setEditingTeam(null); setMode('login');
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm('WARNING: Are you sure you want to permanently delete this team?')) return;
    setLoading(true);
    await supabase.from('teams').delete().eq('team_id', id);
    const { data } = await supabase.from('teams').select('*');
    if (data) setAllTeams(data);
    setLoading(false);
  };

  const handleSaveTeamEdit = async () => {
    setLoading(true);
    const { error } = await supabase.from('teams').update({
      team_name: editingTeam.team_name, site_password: editingTeam.site_password,
      admin_password: editingTeam.admin_password, ai_rules_password: editingTeam.ai_rules_password
    }).eq('team_id', editingTeam.team_id);
    if (!error) { const { data } = await supabase.from('teams').select('*'); if (data) setAllTeams(data); setEditingTeam(null); }
    else alert("Failed to update team: " + error.message);
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',background:t.bg,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <style>{`*{box-sizing:border-box}html,body{margin:0;padding:0;background:${t.bg}}`}</style>
      <div style={{background:t.card,border:`1px solid ${t.accent}`,borderRadius:16,padding:'2.5rem 2rem',width:'100%',maxWidth:420,boxShadow:`0 0 30px ${t.accentGlow}`,position:'relative'}}>
        <div style={{textAlign:'center',marginBottom:'1.5rem'}}>
          <div style={{width:56,height:56,borderRadius:'50%',background:t.accentGlow,border:'1px solid '+t.accent,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',fontSize:26}}>🏛️</div>
          <div style={{fontSize:11,color:t.muted,letterSpacing:'3px',textTransform:'uppercase',marginBottom:8}}>Event Management System</div>
          <h2 style={{margin:'0 0 4px',fontSize:20,fontWeight:600,color:t.text}}>Summit Dashboard v2</h2>
          <p style={{margin:0,fontSize:13,color:t.muted}}>Multi-Team · Event Management</p>
        </div>

        {mode !== 'superadmin' && (
          <div style={{display:'flex',background:t.bg,borderRadius:10,padding:3,marginBottom:20,gap:4}}>
            {[['login','Sign In'],['create','New Team'],['change','Change Password']].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setPwErr('');setCreateErr('');setChangeErr('');setChangeOk(false);}}
                style={{flex:1,padding:'7px 0',borderRadius:8,border:'none',fontSize:13,fontWeight:500,cursor:'pointer',
                background:mode===m?t.accent:'transparent',color:mode===m?'#fff':t.muted,transition:'all 0.2s'}}>
                {l}
              </button>
            ))}
          </div>
        )}

        {mode === 'login' && (
          <>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Team Name</label>
              <input type="text" value={teamNameInput} onChange={e=>{setTeamNameInput(e.target.value);setPwErr('');}}
                onKeyDown={e=>e.key==='Enter'&&document.getElementById('loginPwField').focus()}
                placeholder="e.g. Team Alpha" autoFocus style={{...inp,marginBottom:0}}/>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Site Password</label>
              <input id="loginPwField" type="password" value={pwInput} onChange={e=>{setPwInput(e.target.value);setPwErr('');}}
                onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Team site password"
                style={{...inp,marginBottom:0,border:'1px solid '+(pwErr?'#ef4444':t.border)}}/>
            </div>
            {pwErr&&<p style={{margin:'0 0 10px',fontSize:12,color:'#ef4444',textAlign:'center'}}>{pwErr}</p>}
            <button onClick={handleLogin} disabled={loading}
              style={{width:'100%',background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:12,fontSize:14,fontWeight:500,cursor:loading?'default':'pointer',opacity:loading?0.7:1}}>
              {loading?'Checking...':'Enter'}
            </button>
          </>
        )}

        {mode === 'create' && (
          <>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[['teamName','Team Name','e.g. Team Alpha, PA-2 Section','text'],
                ['sitePw','Site Password','Members use this to log in','text'],
                ['adminPw','Admin Password','Unlocks agentic AI mode','text'],
                ['aiRulesPw','AI Rules Password','Controls AI system prompt','text']
              ].map(([key,label,ph,type])=>(
                <div key={key}>
                  <label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>{label}</label>
                  <input type={type} value={createForm[key]} onChange={e=>setCreateForm(f=>({...f,[key]:e.target.value}))}
                    placeholder={ph} style={inp}/>
                </div>
              ))}
            </div>
            {createErr&&<p style={{margin:'10px 0 0',fontSize:12,color:'#ef4444',textAlign:'center'}}>{createErr}</p>}
            <button onClick={handleCreate} disabled={loading}
              style={{width:'100%',marginTop:14,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:12,fontSize:14,fontWeight:500,cursor:loading?'default':'pointer',opacity:loading?0.7:1}}>
              {loading?'Creating Team...':'Create Team & Enter'}
            </button>
            <p style={{margin:'10px 0 0',fontSize:11,color:t.muted,textAlign:'center'}}>Each team gets completely isolated data. Share the site password with your members.</p>
          </>
        )}

        {mode === 'change' && (
          <>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {[['teamName','Team Name','Your team name','text'],['currentPw','Current Password','Current password','password'],['newPw','New Password','New password','password'],['confirmPw','Confirm New Password','Confirm new password','password']].map(([key,label,ph,type])=>(
                <div key={key} style={{marginBottom:10}}>
                  <label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>{label}</label>
                  <input type={type} value={changeForm[key]} onChange={e=>setChangeForm(f=>({...f,[key]:e.target.value}))} placeholder={ph} style={inp}/>
                </div>
              ))}
              {changeErr&&<p style={{margin:'0 0 8px',fontSize:12,color:'#ef4444',textAlign:'center'}}>{changeErr}</p>}
              {changeOk&&<p style={{margin:'0 0 8px',fontSize:12,color:'#22c55e',textAlign:'center'}}>Password updated successfully!</p>}
              <button onClick={handleChangePw} disabled={loading} style={{width:'100%',background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:12,fontSize:14,fontWeight:500,cursor:loading?'default':'pointer',opacity:loading?0.7:1}}>
                {loading?'Updating...':'Change Password'}
              </button>
            </div>
          </>
        )}

        {mode === 'superadmin' && !superAdminUnlocked && (
          <div style={{display:'flex',flexDirection:'column',gap:12,animation:'fadeIn 0.3s'}}>
            <h3 style={{margin:0,fontSize:16,color:t.text,textAlign:'center'}}>Super Admin Access</h3>
            <div>
              <label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Master Password</label>
              <input type="password" value={superPwInput} onChange={e=>{setSuperPwInput(e.target.value);setSuperErr('');}} onKeyDown={e=>e.key==='Enter'&&handleSuperLogin()} placeholder="Enter master password" style={inp} autoFocus/>
            </div>
            {superErr&&<p style={{margin:'0 0 8px',fontSize:12,color:'#ef4444',textAlign:'center'}}>{superErr}</p>}
            <button onClick={handleSuperLogin} disabled={loading} style={{width:'100%',background:'#7c3aed',color:'#fff',border:'none',borderRadius:8,padding:12,fontSize:14,fontWeight:500,cursor:loading?'default':'pointer'}}>
              {loading?'Loading...':'Unlock Admin Panel'}
            </button>
            <button onClick={()=>setMode('login')} style={{width:'100%',background:'transparent',color:t.text,border:'1px solid '+t.border,borderRadius:8,padding:12,fontSize:14,fontWeight:500,cursor:'pointer'}}>Cancel</button>
          </div>
        )}

        {mode === 'superadmin' && superAdminUnlocked && !editingTeam && (
          <div style={{display:'flex',flexDirection:'column',gap:12,animation:'fadeIn 0.3s'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{margin:0,fontSize:16,color:t.text}}>Manage Teams <span style={{fontSize:12,background:t.accentGlow,color:t.accent,padding:'2px 8px',borderRadius:12}}>{allTeams.length} Total</span></h3>
            </div>
            <div style={{maxHeight:280,overflowY:'auto',display:'flex',flexDirection:'column',gap:8,paddingRight:4}}>
              {allTeams.map(tm => (
                <div key={tm.team_id} style={{background:t.bg,border:'1px solid '+t.border,borderRadius:10,padding:12,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{overflow:'hidden',textOverflow:'ellipsis'}}>
                    <div style={{fontSize:14,fontWeight:600,color:t.text}}>{tm.team_name}</div>
                    <div style={{fontSize:10,color:t.muted,fontFamily:'monospace',marginTop:2}}>{tm.team_id}</div>
                  </div>
                  <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button onClick={()=>setEditingTeam(tm)} style={{background:t.surface,border:'1px solid '+t.border,borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer',color:t.text}}>Edit</button>
                    <button onClick={()=>handleDeleteTeam(tm.team_id)} style={{background:'rgba(239,68,68,0.1)',border:'1px solid #ef4444',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer',color:'#ef4444'}}>Del</button>
                  </div>
                </div>
              ))}
              {allTeams.length === 0 && <p style={{fontSize:13,color:t.muted,textAlign:'center',padding:'20px 0'}}>No teams found.</p>}
            </div>
            <button onClick={handleSuperLogout} style={{marginTop:8,width:'100%',background:'transparent',border:'1px solid #ef4444',color:'#ef4444',borderRadius:8,padding:10,fontSize:13,fontWeight:600,cursor:'pointer'}}>
              🔒 Lock & Exit Admin Panel
            </button>
          </div>
        )}

        {mode === 'superadmin' && superAdminUnlocked && editingTeam && (
          <div style={{display:'flex',flexDirection:'column',gap:10,animation:'fadeIn 0.2s'}}>
            <h3 style={{margin:0,fontSize:16,color:t.text,textAlign:'center',marginBottom:10}}>Edit: {editingTeam.team_name}</h3>
            {[['team_name','Team Name'],['site_password','Site Password'],['admin_password','Admin Password'],['ai_rules_password','AI Rules Password']].map(([key,label])=>(
              <div key={key}>
                <label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>{label}</label>
                <input type="text" value={editingTeam[key]} onChange={e=>setEditingTeam({...editingTeam,[key]:e.target.value})} style={inp}/>
              </div>
            ))}
            <div style={{display:'flex',gap:10,marginTop:10}}>
              <button onClick={()=>setEditingTeam(null)} disabled={loading} style={{flex:1,background:'transparent',border:'1px solid '+t.border,color:t.text,borderRadius:8,padding:10,fontSize:13,cursor:'pointer'}}>Cancel</button>
              <button onClick={handleSaveTeamEdit} disabled={loading} style={{flex:1,background:'#10B981',color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:13,fontWeight:500,cursor:loading?'default':'pointer'}}>{loading?'Saving...':'Save Changes'}</button>
            </div>
          </div>
        )}

        {mode !== 'superadmin' && (
          <div style={{marginTop:20,textAlign:'center'}}>
            <button onClick={()=>{setMode('superadmin');setSuperPwInput('');setSuperErr('');}}
              style={{background:'transparent',border:'none',color:t.muted,fontSize:11,cursor:'pointer',opacity:0.6}}>
              ⚙️ Manage Teams
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── App Component ──────────────────────────────────────────────────────────
export default function App() {
  const [team, setTeam] = useState(() => {
    const saved = localStorage.getItem('ems_team_session');
    return saved ? JSON.parse(saved) : null;
  });
  const teamId = team?.team_id;
  const [authed, setAuthed] = useState(() => !!localStorage.getItem('ems_team_session'));
  const [adminMode, setAdminMode] = useState(false);
  const [adminPwInput, setAdminPwInput]       = useState('');
  const [adminPwErr, setAdminPwErr]           = useState(false);
  const [showAdminModal, setShowAdminModal]   = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [pwChangeForm, setPwChangeForm]       = useState({ auth:'', newSite:'', newAdmin:'', newAiRules:'' });

  const [isDark, setIsDark] = useState(true);
  const t   = useMemo(()=>makeTheme(isDark),[isDark]);
  const inp = useMemo(()=>mkInp(t),[t]);

  const [customAiRules, setCustomAiRules]             = useState('');
  const [showAiRulesAuthModal, setShowAiRulesAuthModal] = useState(false);
  const [showAiRulesModal, setShowAiRulesModal]         = useState(false);
  const [aiRulesPwInput, setAiRulesPwInput]             = useState('');
  const [aiRulesPwErr, setAiRulesPwErr]                 = useState(false);

  const [verticals, setVerticals]   = useState({});
  const [officers, setOfficers]     = useState({});
  const [resources, setResources]   = useState({}); // NEW
  const [tasks, setTasks]           = useState({});
  const [movements, setMovements]   = useState([]);
  const [orders, setOrders]         = useState([]);
  const [syncStatus, setSyncStatus] = useState('connecting');

  const [teamMessages, setTeamMessages]       = useState([]);
  const [teamChatInput, setTeamChatInput]     = useState('');
  const [teamChatFile, setTeamChatFile]       = useState(null);
  const [teamChatUploading, setTeamChatUploading] = useState(false);
  const teamChatEndRef  = useRef(null);
  const teamChatFileRef = useRef(null);
  const teamChatCameraRef = useRef(null);

  const [username, setUsername]               = useState(()=>localStorage.getItem('ems_username')||'');
  const [usernameLastChanged, setUsernameLastChanged] = useState(()=>parseInt(localStorage.getItem('ems_username_time')||'0',10));
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [usernameInput, setUsernameInput]     = useState('');
  const [usernameError, setUsernameError]     = useState('');

  const [view, setView]                   = useState('dashboard');
  const [taskFilter, setTaskFilter]       = useState('all');
  const [taskVerticalFilter, setTaskVerticalFilter] = useState('all');
  const [isNavOpen, setIsNavOpen]         = useState(false);
  const isUpdatingTasksRef                = useRef(false);
  const tasksRef                          = useRef({});

  useEffect(()=>{ tasksRef.current = tasks; },[tasks]);


  // ── Drag & drop state ──
  const [draggedTask, setDraggedTask]   = useState(null);
  const draggedTaskIdRef                = useRef(null);
  const [dropTarget, setDropTarget]     = useState({ verticalId:null, taskId:null });
  const dropTargetRef                   = useRef({ verticalId:null, taskId:null });
  const [copiedTask, setCopiedTask]     = useState(null);

  const [modal, setModal]         = useState(null);
  const [modalData, setModalData] = useState({});
  const [vForm, setVForm]         = useState({ name:'', lead:'', status:'active' });
  const [oForm, setOForm] = useState({ name:'', designation:'', contact:'', current_vertical:'', origin_station:'', deployment_duration:'' });
  const [rForm, setRForm]         = useState({ name:'', quantity: 1, current_vertical:'' }); // NEW
  const [tForm, setTForm]         = useState({ title:'', description:'', goal:'', task_order:1, vertical_id:'', assigned_officer:'', status:'pending' });
  const [clearOpts, setClearOpts] = useState({ verticals:true, officers:true, resources:true, tasks:true, movements:true });

  const [orderFile, setOrderFile]           = useState(null);
  const [orderTitle, setOrderTitle]         = useState('');
  const [orderDivision, setOrderDivision]   = useState('');
  const [orderUploading, setOrderUploading] = useState(false);
  const [orderProgress, setOrderProgress]   = useState(0);
  const [ordersFilter, setOrdersFilter]     = useState('all');
  const fileInputRef = useRef(null);
  const [viewPdf, setViewPdf]               = useState(null);

  const [chatOpen, setChatOpen]         = useState(false);
  const [chatInput, setChatInput]       = useState('');
  const [chatHistory, setChatHistory]   = useState([]);
  const [chatLoading, setChatLoading]   = useState(false);
  const chatEndRef   = useRef(null);
  const [chatPos, setChatPos]           = useState({ x:0, y:0 });
  const isDraggingChat  = useRef(false);
  const chatDragStart   = useRef({ x:0, y:0 });
  const chatDragMoved   = useRef(false);

  useEffect(()=>{
    const onMove = e=>{ if(!isDraggingChat.current) return; chatDragMoved.current=true; setChatPos({x:e.clientX-chatDragStart.current.x,y:e.clientY-chatDragStart.current.y}); };
    const onUp   = ()=>{ isDraggingChat.current=false; setTimeout(()=>{chatDragMoved.current=false;},50); };
    window.addEventListener('pointermove',onMove); window.addEventListener('pointerup',onUp);
    return ()=>{ window.removeEventListener('pointermove',onMove); window.removeEventListener('pointerup',onUp); };
  },[]);
  const startDragChat = e=>{ isDraggingChat.current=true; chatDragMoved.current=false; chatDragStart.current={x:e.clientX-chatPos.x,y:e.clientY-chatPos.y}; };

  // ── Data loaders ──────────────────────────────────────────────────────
  const loadVerticals = async (tid) => {
    const { data } = await supabase.from('sd_verticals').select('*').eq('team_id', tid);
    if (data) { const m={}; data.forEach(d=>m[d.id]=d); setVerticals(m); setSyncStatus('live'); }
  };
  const loadOfficers  = async (tid) => {
    const { data } = await supabase.from('sd_officers').select('*').eq('team_id', tid);
    if (data) { const m={}; data.forEach(d=>m[d.id]=d); setOfficers(m); }
  };
  const loadResources = async (tid) => {
    const { data } = await supabase.from('sd_resources').select('*').eq('team_id', tid);
    if (data) { const m={}; data.forEach(d=>m[d.id]=d); setResources(m); }
  };
  const loadTasks     = async (tid) => {
    if (isUpdatingTasksRef.current) return;
    const { data } = await supabase.from('sd_tasks').select('*').eq('team_id', tid);
    if (data) { const m={}; data.forEach(d=>m[d.id]=d); setTasks(m); }
  };
  const loadMovements = async (tid) => {
    const { data } = await supabase.from('sd_movements').select('*').eq('team_id', tid).order('ts', { ascending:false });
    if (data) setMovements(data);
  };
  const loadOrders    = async (tid) => {
    const { data } = await supabase.from('sd_orders').select('*').eq('team_id', tid).order('uploaded_at', { ascending:false });
    if (data) setOrders(data);
  };
  const loadMessages  = async (tid) => {
    const { data } = await supabase.from('sd_messages').select('*').eq('team_id', tid).order('ts', { ascending:true });
    if (data) setTeamMessages(data);
  };

  const seedTeamData = async (tid) => {
    const { data: existV } = await supabase.from('sd_verticals').select('id').eq('team_id', tid);
    if (existV && existV.length > 0) return;
    const ts = new Date().toISOString();
    await supabase.from('sd_verticals').insert(SEED_VERTICALS.map(v=>({...v, team_id:tid, created_at:ts})));
    await supabase.from('sd_officers').insert(SEED_OFFICERS.map(o=>({...o, team_id:tid, created_at:ts})));
    await supabase.from('sd_tasks').insert(SEED_TASKS.map(t=>({...t, team_id:tid, created_at:ts})));
  };

  useEffect(()=>{
    if (!authed || !teamId) return;
    setSyncStatus('connecting');
    const init = async () => {
      await seedTeamData(teamId);
      await Promise.all([loadVerticals(teamId), loadOfficers(teamId), loadResources(teamId), loadTasks(teamId), loadMovements(teamId), loadOrders(teamId), loadMessages(teamId)]);
    };
    init();
    const channel = supabase.channel(`team-${teamId}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'sd_verticals', filter:`team_id=eq.${teamId}`},()=>loadVerticals(teamId))
      .on('postgres_changes',{event:'*',schema:'public',table:'sd_officers',  filter:`team_id=eq.${teamId}`},()=>loadOfficers(teamId))
      .on('postgres_changes',{event:'*',schema:'public',table:'sd_resources', filter:`team_id=eq.${teamId}`},()=>loadResources(teamId))
      .on('postgres_changes',{event:'*',schema:'public',table:'sd_tasks',     filter:`team_id=eq.${teamId}`},()=>loadTasks(teamId))
      .on('postgres_changes',{event:'*',schema:'public',table:'sd_movements', filter:`team_id=eq.${teamId}`},()=>loadMovements(teamId))
      .on('postgres_changes',{event:'*',schema:'public',table:'sd_orders',    filter:`team_id=eq.${teamId}`},()=>loadOrders(teamId))
      .on('postgres_changes',{event:'*',schema:'public',table:'sd_messages',  filter:`team_id=eq.${teamId}`},()=>loadMessages(teamId))
      .subscribe(status=>{ if(status==='SUBSCRIBED') setSyncStatus('live'); else if(status==='CHANNEL_ERROR') setSyncStatus('error'); });
    return ()=>{ supabase.removeChannel(channel); };
  },[authed, teamId]);

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:'smooth'}); },[chatHistory,chatLoading]);
  useEffect(()=>{ teamChatEndRef.current?.scrollIntoView({behavior:'smooth'}); },[teamMessages,view]);
  useEffect(()=>{ if(view==='messages'&&!username){ setUsernameInput(''); setShowUsernameModal(true); } },[view,username]);
  useEffect(()=>{ tasksRef.current = tasks; },[tasks]);

  // ── Auth ──────────────────────────────────────────────────────────────
  const handleLogout = ()=>{ setAuthed(false); setTeam(null); setAdminMode(false); setView('dashboard'); setIsNavOpen(false); localStorage.removeItem('ems_team_session'); };
// ── Auto-logout after 10 min inactivity (2 min warning) ──
const [showInactivityWarning, setShowInactivityWarning] = useState(false);
useEffect(()=>{
  if (!authed) return;
  let warningTimer, logoutTimer;
  const reset = () => {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
    setShowInactivityWarning(false);
    warningTimer = setTimeout(() => setShowInactivityWarning(true), 8 * 60 * 1000);
    logoutTimer  = setTimeout(() => handleLogout(), 10 * 60 * 1000);
  };
  const events = ['mousemove','mousedown','keydown','touchstart','scroll','click'];
  events.forEach(e => window.addEventListener(e, reset));
  reset();
  return () => {
    clearTimeout(warningTimer);
    clearTimeout(logoutTimer);
    events.forEach(e => window.removeEventListener(e, reset));
  };
}, [authed]);

  const handleAdminUnlock = ()=>{
    if(adminPwInput===team.admin_password){ setAdminMode(true); setAdminPwErr(false); setAdminPwInput(''); setShowAdminModal(false); setIsNavOpen(false); }
    else setAdminPwErr(true);
  };
  const handleAiRulesUnlock = ()=>{
    if(aiRulesPwInput===team.ai_rules_password){ setShowAiRulesAuthModal(false); setShowAiRulesModal(true); setAiRulesPwInput(''); setAiRulesPwErr(false); }
    else setAiRulesPwErr(true);
  };
  const handlePasswordChangeSubmit = async () => {
    if(pwChangeForm.auth !== team.admin_password){
      setModalData({icon:'⚠️',title:'Authorization Failed',text:'Incorrect Current Admin Password.',danger:true}); setModal('alert'); return;
    }
    const updates = {};
    if(pwChangeForm.newSite)     updates.site_password     = pwChangeForm.newSite;
    if(pwChangeForm.newAdmin)    updates.admin_password    = pwChangeForm.newAdmin;
    if(pwChangeForm.newAiRules)  updates.ai_rules_password = pwChangeForm.newAiRules;
    if(Object.keys(updates).length > 0){ 
      await supabase.from('teams').update(updates).eq('team_id', teamId); 
      const newTeam = {...team, ...updates};
      setTeam(newTeam); 
      localStorage.setItem('ems_team_session', JSON.stringify(newTeam));
    }
    setShowPasswordChangeModal(false); setPwChangeForm({auth:'',newSite:'',newAdmin:'',newAiRules:''});
    setModalData({icon:'✅',title:'Success',text:'Passwords updated and saved for your team.',danger:false}); setModal('alert');
  };

  // ── CRUD ──────────────────────────────────────────────────────────────
  const saveVertical = async ()=>{
    if(!vForm.name.trim()) return;
    const color = COLORS[Object.keys(verticals).length % COLORS.length];
    if(modalData.id) await supabase.from('sd_verticals').update({name:vForm.name,lead:vForm.lead,status:vForm.status}).eq('id',modalData.id).eq('team_id',teamId);
    else await supabase.from('sd_verticals').insert({id:crypto.randomUUID(), ...vForm, color, team_id:teamId, created_at:new Date().toISOString()});
    setModal(null);
  };
  const saveOfficer = async ()=>{
    if(!oForm.name.trim()) return;
    if(modalData.id) await supabase.from('sd_officers').update(oForm).eq('id',modalData.id).eq('team_id',teamId);
    else await supabase.from('sd_officers').insert({id:crypto.randomUUID(), ...oForm, team_id:teamId, created_at:new Date().toISOString()});
    setModal(null);
  };
  const saveResource = async ()=>{
    if(!rForm.name.trim()) return;
    if(modalData.id) await supabase.from('sd_resources').update({name:rForm.name, quantity:rForm.quantity, current_vertical:rForm.current_vertical}).eq('id',modalData.id).eq('team_id',teamId);
    else await supabase.from('sd_resources').insert({id:crypto.randomUUID(), ...rForm, team_id:teamId, created_at:new Date().toISOString()});
    setModal(null);
  };
  const handleUpdateQuantity = async (rid, newQty) => {
    const qty = parseInt(newQty, 10) || 0;
    await supabase.from('sd_resources').update({quantity: qty}).eq('id', rid).eq('team_id', teamId);
  };
  const saveTask = async ()=>{
    if(!tForm.title.trim()||!tForm.vertical_id) return;
    const isEdit = !!modalData.id;
    const taskId = isEdit ? modalData.id : crypto.randomUUID();
    const newTaskData = { id:taskId, ...tForm, team_id:teamId, created_at:isEdit&&tasks[taskId]?tasks[taskId].created_at:new Date().toISOString() };
    setTasks(prev => ({ ...prev, [taskId]: { ...prev[taskId], ...newTaskData } }));
    setModal(null);
    try {
      if(isEdit) await supabase.from('sd_tasks').update(tForm).eq('id', taskId).eq('team_id', teamId);
      else await supabase.from('sd_tasks').insert(newTaskData);
    } catch (error) { console.error("Failed to save task:", error); }
  };
  const handleDeleteConfirm = async ()=>{
    await supabase.from(modalData.col).delete().eq('id',modalData.id).eq('team_id',teamId);
    setModal(null);
  };
  const handleTaskStatus = async (tid,status)=>{ await supabase.from('sd_tasks').update({status}).eq('id',tid).eq('team_id',teamId); };
  
  const handleQuickMove  = async (oid,toV)=>{
    if(!toV) return;
    const o = officers[oid]; if(!o) return;
    await supabase.from('sd_officers').update({current_vertical:toV}).eq('id',oid).eq('team_id',teamId);
    await supabase.from('sd_movements').insert({ team_id:teamId, officer_id:oid, officer_name:o.name, from_vertical:o.current_vertical, to_vertical:toV, moved_by:'User', ts:new Date().toISOString() });
  };
  const handleQuickMoveResource = async (rid, toV)=>{
    if(!toV) return;
    await supabase.from('sd_resources').update({current_vertical:toV}).eq('id',rid).eq('team_id',teamId);
  };

  const doMoveOfficer = async (oid,toV,movedBy='User')=>{
    const o = officers[oid]; if(!o) return;
    await supabase.from('sd_officers').update({current_vertical:toV}).eq('id',oid).eq('team_id',teamId);
    await supabase.from('sd_movements').insert({ team_id:teamId, officer_id:oid, officer_name:o.name, from_vertical:o.current_vertical, to_vertical:toV, moved_by:movedBy, ts:new Date().toISOString() });
  };
  const handleClearData = async ()=>{
    const cols=[];
    if(clearOpts.verticals) cols.push('sd_verticals');
    if(clearOpts.officers)  cols.push('sd_officers');
    if(clearOpts.resources) cols.push('sd_resources');
    if(clearOpts.tasks)     cols.push('sd_tasks');
    if(clearOpts.movements) cols.push('sd_movements');
    await Promise.all(cols.map(c=>supabase.from(c).delete().eq('team_id',teamId)));
    if(clearOpts.verticals){ const ts=new Date().toISOString(); await supabase.from('sd_verticals').insert(SEED_VERTICALS.map(v=>({...v,team_id:teamId,created_at:ts}))); }
    setModal(null);
  };

  // ── Paste task ────────────────────────────────────────────────────────
  const handlePasteTask = async (targetVerticalId, insertBeforeTaskId=null)=>{
    if(!copiedTask) return;
    const newId = 'task_' + Date.now().toString(36);
    const newTaskData = { id:newId, title:copiedTask.title+' (Copy)', description:copiedTask.description||'', goal:copiedTask.goal||'', vertical_id:targetVerticalId, assigned_officer:copiedTask.assigned_officer||'', status:'pending', team_id:teamId, created_at:new Date().toISOString() };
    let targetList = Object.values(tasks).filter(t=>t.vertical_id===targetVerticalId).sort((a,b)=>(a.task_order||0)-(b.task_order||0));
    if(insertBeforeTaskId){ const idx=targetList.findIndex(t=>t.id===insertBeforeTaskId); if(idx!==-1) targetList.splice(idx,0,{...newTaskData}); else targetList.push({...newTaskData}); }
    else targetList.push({...newTaskData});
    await supabase.from('sd_tasks').insert({...newTaskData, task_order:targetList.findIndex(t=>t.id===newId)+1});
    await Promise.all(targetList.filter(t=>t.id!==newId).map((t,idx)=>supabase.from('sd_tasks').update({task_order:idx+1}).eq('id',t.id).eq('team_id',teamId)));
    setCopiedTask(null);
  };

  // ── DRAG & DROP — pointer-based (reliable cross-browser) ──────────────
  const draggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const ghostRef = useRef(null);

  const startPointerDrag = (e, tk, vt) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
    
    window.getSelection()?.removeAllRanges();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    document.body.classList.add('is-dragging');

    draggedTaskIdRef.current = tk.id;
    setDraggedTask(tk);
    draggingRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };

    const ghost = document.createElement('div');
    ghost.style.cssText = `position:fixed;pointer-events:none;z-index:99999;background:#1e2235;border:2px solid #3B82F6;border-radius:10px;padding:12px 14px;min-width:160px;color:#e8eaf6;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;box-shadow:0 8px 25px rgba(0,0,0,0.5);top:${e.clientY-20}px;left:${e.clientX-80}px;will-change:transform;`;
    ghost.textContent = tk.title;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    const card = e.currentTarget;
    let rafId = null;
    let lastX = e.clientX, lastY = e.clientY;

    let edgeScrollInterval = setInterval(() => {
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        const rect = mainContent.getBoundingClientRect();
        if (lastY < rect.top + 80) mainContent.scrollTop -= 15;
        else if (lastY > rect.bottom - 80) mainContent.scrollTop += 15;
      }
    }, 16);

    const onMove = (ev) => {
      lastX = ev.clientX; lastY = ev.clientY;
      const dx = Math.abs(lastX - pointerStartRef.current.x);
      const dy = Math.abs(lastY - pointerStartRef.current.y);
      if (dx > 5 || dy > 5) draggingRef.current = true;

      if (ghostRef.current) {
        ghostRef.current.style.transform = `translate(${lastX - e.clientX}px, ${lastY - e.clientY}px)`;
      }

      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!ghostRef.current) return;
        
        ghostRef.current.style.display = 'none';
        const el = document.elementFromPoint(lastX, lastY);
        ghostRef.current.style.display = '';

        if (!el) return;
        const taskEl = el.closest('[data-taskid]');
        const vertEl = el.closest('[data-verticalid]');

        if (taskEl) {
          if (taskEl.dataset.taskid !== tk.id) {
            const vid = taskEl.dataset.verticalid;
            const tid = taskEl.dataset.taskid;
            if (dropTargetRef.current.verticalId !== vid || dropTargetRef.current.taskId !== tid) {
              dropTargetRef.current = { verticalId: vid, taskId: tid };
              setDropTarget({ verticalId: vid, taskId: tid });
            }
          }
        } else if (vertEl) {
          const vid = vertEl.dataset.verticalid;
          if (dropTargetRef.current.verticalId !== vid || dropTargetRef.current.taskId !== null) {
            dropTargetRef.current = { verticalId: vid, taskId: null };
            setDropTarget({ verticalId: vid, taskId: null });
          }
        } else if (dropTargetRef.current.verticalId !== null) {
          dropTargetRef.current = { verticalId: null, taskId: null };
          setDropTarget({ verticalId: null, taskId: null });
        }

        const hScroll = el.closest('.h-scroll-container');
        if (hScroll) {
           const hRect = hScroll.getBoundingClientRect();
           if (lastX < hRect.left + 80) hScroll.scrollLeft -= 15;
           else if (lastX > hRect.right - 80) hScroll.scrollLeft += 15;
        }
      });
    };

    const onUp = async (ev) => {
      card.removeEventListener('pointermove', onMove);
      card.removeEventListener('pointerup', onUp);
      card.removeEventListener('pointercancel', onUp);
      clearInterval(edgeScrollInterval);
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      if (ghostRef.current) { ghostRef.current.remove(); ghostRef.current = null; }

      document.body.classList.remove('is-dragging');

      const didDrag = draggingRef.current;
      const targetVerticalId = dropTargetRef.current.verticalId;
      const targetTaskId = dropTargetRef.current.taskId;
      const draggedId = draggedTaskIdRef.current;

      draggedTaskIdRef.current = null;
      setDraggedTask(null);
      setDropTarget({ verticalId: null, taskId: null });
      dropTargetRef.current = { verticalId: null, taskId: null };
      draggingRef.current = false;

      if (!didDrag || !targetVerticalId || !draggedId) return;

      const currentTasks = tasksRef.current;
      const draggedItem = currentTasks[draggedId];
      if (!draggedItem) return;

      const oldVerticalId = draggedItem.vertical_id;
      const updates = [];

      if (oldVerticalId !== targetVerticalId) {
        Object.values(currentTasks)
          .filter(t => t.vertical_id === oldVerticalId && t.id !== draggedId)
          .sort((a, b) => (a.task_order || 0) - (b.task_order || 0))
          .forEach((t, idx) => updates.push({ id: t.id, task_order: idx + 1, vertical_id: oldVerticalId }));
      }

      let targetList = Object.values(currentTasks)
        .filter(t => t.vertical_id === targetVerticalId)
        .sort((a, b) => (a.task_order || 0) - (b.task_order || 0))
        .filter(t => t.id !== draggedId);

      const draggedWithNew = { ...draggedItem, vertical_id: targetVerticalId };
      if (targetTaskId) {
        const idx = targetList.findIndex(t => t.id === targetTaskId);
        if (idx !== -1) targetList.splice(idx, 0, draggedWithNew);
        else targetList.push(draggedWithNew);
      } else {
        targetList.push(draggedWithNew);
      }
      targetList.forEach((t, idx) => updates.push({ id: t.id, task_order: idx + 1, vertical_id: targetVerticalId }));

      const newState = { ...currentTasks };
      updates.forEach(u => { newState[u.id] = { ...newState[u.id], task_order: u.task_order, vertical_id: u.vertical_id }; });
      setTasks(newState);

      isUpdatingTasksRef.current = true;
      try {
        await Promise.all(updates.map(u =>
          supabase.from('sd_tasks').update({ task_order: u.task_order, vertical_id: u.vertical_id }).eq('id', u.id).eq('team_id', teamId)
        ));
      } catch (err) {
        console.error('DnD failed:', err);
      } finally {
        setTimeout(() => { isUpdatingTasksRef.current = false; loadTasks(teamId); }, 500);
      }
    };

    card.addEventListener('pointermove', onMove);
    card.addEventListener('pointerup', onUp);
    card.addEventListener('pointercancel', onUp);
  };

  // ── Orders / Chat / Username ──────────────────────────────────────────
  const handleUploadOrder = async ()=>{
    if(!orderFile||!orderTitle.trim()||!orderDivision) return;
    setOrderUploading(true); setOrderProgress(50);
    try {
      const filename = `${teamId}/orders/${Date.now()}_${orderFile.name}`;
      const { error:upErr } = await supabase.storage.from('Orders').upload(filename, orderFile, { cacheControl:'3600', upsert:false, contentType:orderFile.type });
      if(upErr) throw upErr;
      const { data:{ publicUrl } } = supabase.storage.from('Orders').getPublicUrl(filename);
      await supabase.from('sd_orders').insert({ team_id:teamId, title:orderTitle.trim(), division:orderDivision, file_name:orderFile.name, file_size:orderFile.size, file_url:publicUrl, storage_path:filename, uploaded_at:new Date().toISOString(), uploaded_by:'Admin' });
      setOrderProgress(100);
      setTimeout(()=>{ setOrderFile(null); setOrderTitle(''); setOrderDivision(''); setOrderProgress(0); if(fileInputRef.current) fileInputRef.current.value=''; },500);
    } catch(e){ setOrderProgress(0); setModalData({icon:'⚠️',title:'Upload Failed',text:e.message,danger:true}); setModal('alert'); }
    setOrderUploading(false);
  };
  const handleDeleteOrder = async (order)=>{
    try {
      if(order.storage_path) await supabase.storage.from('Orders').remove([order.storage_path]);
      await supabase.from('sd_orders').delete().eq('id',order.id).eq('team_id',teamId);
      setModal(null);
    } catch(e){ setModalData({icon:'⚠️',title:'Delete Failed',text:e.message,danger:true}); setModal('alert'); }
  };
  const handleSendTeamMessage = async ()=>{
    if(!teamChatInput.trim()&&!teamChatFile) return;
    setTeamChatUploading(true);
    let fileData=null;
    try {
      if(teamChatFile){
        const filename=`${teamId}/chat/${Date.now()}_${teamChatFile.name}`;
        const { error } = await supabase.storage.from('Orders').upload(filename,teamChatFile,{cacheControl:'3600',upsert:false});
        if(error) throw error;
        const { data:{publicUrl} } = supabase.storage.from('Orders').getPublicUrl(filename);
        fileData={ name:teamChatFile.name, url:publicUrl, path:filename, type:teamChatFile.type };
      }
      await supabase.from('sd_messages').insert({ team_id:teamId, text:teamChatInput.trim(), file:fileData, sender:adminMode?'Admin':'Official', sender_name:username||'Unknown', ts:new Date().toISOString() });
      setTeamChatInput(''); setTeamChatFile(null);
      if(teamChatFileRef.current) teamChatFileRef.current.value='';
      if(teamChatCameraRef.current) teamChatCameraRef.current.value='';
    } catch(e){ setModalData({icon:'⚠️',title:'Message Failed',text:e.message,danger:true}); setModal('alert'); }
    setTeamChatUploading(false);
  };
  const handleDeleteTeamMessage = async (msg)=>{
    try {
      if(msg.file?.path) await supabase.storage.from('Orders').remove([msg.file.path]);
      await supabase.from('sd_messages').delete().eq('id',msg.id).eq('team_id',teamId);
    } catch(e){ setModalData({icon:'⚠️',title:'Delete Failed',text:e.message,danger:true}); setModal('alert'); }
  };
  const handleClearTeamChat = async ()=>{
    try {
      const { data:msgs } = await supabase.from('sd_messages').select('*').eq('team_id',teamId);
      const paths = (msgs||[]).filter(m=>m.file?.path).map(m=>m.file.path);
      if(paths.length>0) await supabase.storage.from('Orders').remove(paths);
      await supabase.from('sd_messages').delete().eq('team_id',teamId);
      setModal(null);
    } catch(e){ setModalData({icon:'⚠️',title:'Clear Failed',text:e.message,danger:true}); setModal('alert'); }
  };
  const handleSaveUsername = ()=>{
    const trimmed=usernameInput.trim();
    if(!trimmed){ setUsernameError('Username cannot be empty.'); return; }
    const COOLDOWN=14*24*60*60*1000;
    if(username&&(Date.now()-usernameLastChanged<COOLDOWN)){ const days=Math.ceil((COOLDOWN-(Date.now()-usernameLastChanged))/(86400000)); setUsernameError(`Wait ${days} more day${days!==1?'s':''} before changing.`); return; }
    setUsername(trimmed); setUsernameLastChanged(Date.now());
    localStorage.setItem('ems_username',trimmed); localStorage.setItem('ems_username_time',Date.now().toString());
    setShowUsernameModal(false); setUsernameError('');
  };

  // ── AI Chat ───────────────────────────────────────────────────────────
  const sendChat = async (msg)=>{
    const text=msg||chatInput.trim(); if(!text) return;
    setChatInput('');
    const hist=[...chatHistory,{role:'user',content:text}];
    setChatHistory(hist); setChatLoading(true);
    const vArr=Object.values(verticals); const oArr=Object.values(officers); const rArr=Object.values(resources); const tArr=Object.values(tasks);
    const vList=vArr.map(v=>v.name+'(lead:'+v.lead+')').join('; ');
    const oList=oArr.map(o=>o.name+'['+o.designation+']→'+(verticals[o.current_vertical]?.name||o.current_vertical)).join('; ');
    const rList=rArr.map(r=>r.name+'(Qty:'+r.quantity+')→'+(verticals[r.current_vertical]?.name||r.current_vertical)).join('; ');
    const tList=tArr.map(tk=>'"'+tk.title+'"['+tk.status+'] in '+(verticals[tk.vertical_id]?.name||tk.vertical_id)+', by '+(officers[tk.assigned_officer]?.name||'?')).join('; ');
    const mLog=movements.slice(0,8).map(m=>m.officer_name+':'+m.from_vertical+'→'+m.to_vertical).join('; ');
    const sys=`You are an AI assistant for the Event Management System (Team: ${team?.team_name}). You are known as EMS AI Agent.
VERTICALS: ${vList}
OFFICERS: ${oList}
RESOURCES: ${rList}
TASKS: ${tList}
MOVEMENTS: ${mLog}
${adminMode?`AGENTIC MODE ACTIVE. Append one action at end when changes requested:
<ACTION>{"type":"MOVE_OFFICER","officerId":"o1","toVertical":"eg_it"}</ACTION>
<ACTION>{"type":"UPDATE_TASK","taskId":"t1","status":"done"}</ACTION>
<ACTION>{"type":"ADD_OFFICER","name":"...","designation":"...","current_vertical":"...","contact":"..."}</ACTION>
<ACTION>{"type":"ADD_VERTICAL","name":"...","lead":"..."}</ACTION>
Officer IDs: ${Object.entries(officers).map(([id,o])=>id+'='+o.name).join(', ')}.
Vertical IDs: ${Object.keys(verticals).join(', ')}.`:'AGENTIC MODE INACTIVE. Information only.'}
${customAiRules?`\nCUSTOM SYSTEM RULES:\n${customAiRules}\n`:''}
Be concise and professional.`;
    try {
      const res=await fetch('https://api.deepseek.com/chat/completions',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer sk-d473ce128ef54edba098b3751e0e6b7f'},
        body:JSON.stringify({model:'deepseek-v4-flash',max_tokens:2000,messages:[{role:'system',content:sys},...hist.slice(-6).map(m=>({role:m.role,content:m.content})),{role:'user',content:text}]})
      });
      const data=await res.json();
      let full=data.choices?.[0]?.message?.content||'Sorry, no response.';
      const match=full.match(/<ACTION>(.*?)<\/ACTION>/s);
      let display=full.replace(/<ACTION>.*?<\/ACTION>/s,'').trim();
      if(match&&adminMode){
        try {
          const act=JSON.parse(match[1]);
          if(act.type==='MOVE_OFFICER'){ await doMoveOfficer(act.officerId,act.toVertical,'AI'); display+='\n\n✅ Officer moved.'; }
          else if(act.type==='UPDATE_TASK'){ await supabase.from('sd_tasks').update({status:act.status}).eq('id',act.taskId).eq('team_id',teamId); display+='\n\n✅ Task updated.'; }
          else if(act.type==='ADD_OFFICER'){ await supabase.from('sd_officers').insert({name:act.name,designation:act.designation,current_vertical:act.current_vertical,contact:act.contact||'',team_id:teamId,created_at:new Date().toISOString()}); display+='\n\n✅ Officer added.'; }
          else if(act.type==='ADD_VERTICAL'){ await supabase.from('sd_verticals').insert({name:act.name,lead:act.lead,status:'active',color:COLORS[Math.floor(Math.random()*COLORS.length)],team_id:teamId,created_at:new Date().toISOString()}); display+='\n\n✅ Vertical added.'; }
        } catch(e){ display+='\n\n⚠️ Action failed: '+e.message; }
      }
      setChatHistory(h=>[...h,{role:'assistant',content:display}]);
    } catch(e){ setChatHistory(h=>[...h,{role:'assistant',content:'Error: '+e.message}]); }
    setChatLoading(false);
  };

  // ── Derived ───────────────────────────────────────────────────────────
  const vArr=Object.values(verticals);
  const oArr=Object.values(officers);
  const rArr=Object.values(resources);
  const tArr=Object.values(tasks);
  const doneTasks=tArr.filter(x=>x.status==='done').length;
  const SC=STATUS_COLORS;
  const SL={done:'Done','in-progress':'In Progress',pending:'Pending'};
  const filteredTasks=tArr.filter(x=>taskFilter==='all'||x.status===taskFilter).filter(x=>taskVerticalFilter==='all'||x.vertical_id===taskVerticalFilter);
  const handleStatClick=label=>{ if(label==='Verticals')setView('verticals'); else if(label==='Resources')setView('resources'); else if(label==='Tasks Done'){setView('tasks');setTaskFilter('done');setTaskVerticalFilter('all');} else if(label==='All Tasks'){setView('tasks');setTaskFilter('all');setTaskVerticalFilter('all');} };
  const openVerticalTasks=vid=>{ setView('tasks'); setTaskVerticalFilter(vid); setTaskFilter('all'); };
  const fmtSize=b=>b>1048576?(b/1048576).toFixed(1)+' MB':Math.round(b/1024)+' KB';
  const fmtDate=ts=>{ try{ return new Date(ts?.toDate?ts.toDate():ts).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); }catch(e){return '';} };

  const VIEWS=[
    {id:'dashboard',label:'📊 Dashboard'},
    {id:'messages', label:'💬 Team Chat'},
    {id:'verticals',label:'🗂️ Verticals'},
    {id:'resources',label:'📦 Resources'},
    {id:'tasks',    label:'✅ Task Chains'},
    {id:'movements',label:'🔄 Movement Log'},
    {id:'orders',   label:'📄 Issued Orders'},
  ];

  if(!authed) return <LoginScreen onLogin={teamData=>{ setTeam(teamData); setAuthed(true); localStorage.setItem('ems_team_session', JSON.stringify(teamData)); }}/>;

  return (
    <div style={{display:'flex',minHeight:'100vh',background:t.bg,fontFamily:'system-ui,sans-serif',marginRight:chatOpen&&window.innerWidth>768?'380px':'0',transition:'margin-right 0.3s cubic-bezier(0.4,0,0.2,1)'}}>
      <style>{`
        *{box-sizing:border-box}html,body{margin:0;padding:0;background:${t.bg}}
        input,select,textarea{font-family:inherit} select option{background:${t.card};color:${t.text}}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:${t.bg}}::-webkit-scrollbar-thumb{background:${t.border};border-radius:3px}
        .navItem:hover{background:rgba(255,255,255,0.03)!important;color:${t.text}!important}
        .jcard:hover{border-color:${t.borderHover}!important}
        .statCard{cursor:pointer;transition:all 0.15s}.statCard:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.2)!important}
        .vcard{cursor:pointer;transition:all 0.15s}.vcard:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.25)!important;border-color:${t.accent}!important}
        .menu-btn{display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid ${t.border};border-radius:8px;width:38px;height:38px;cursor:pointer;color:${t.text};font-size:18px;flex-shrink:0;transition:background 0.2s}
        .menu-btn:hover{background:${t.accentGlow}}
        .paste-btn:hover{transform:scale(1.05);background:${t.accent}!important;color:#fff!important}
        .sidebar{transform:translateX(-100%);transition:transform 0.3s cubic-bezier(0.4,0,0.2,1);z-index:5000!important}
        .sidebar.open{transform:translateX(0);box-shadow:4px 0 15px rgba(0,0,0,0.05)}
        .main-content{margin-left:0;width:100%;transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}
        .main-content.nav-open{margin-left:220px;width:calc(100% - 220px)}
        .chat-panel{position:fixed;background:${t.card};display:flex;flex-direction:column;z-index:5500;transition:all 0.3s cubic-bezier(0.4,0,0.2,1);overflow:hidden}
        
        /* NUCLEAR OPTION TO PREVENT TEXT HIGHLIGHTING WHILE DRAGGING */
        .is-dragging, .is-dragging * {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
        }

        @media(max-width:768px){.chat-panel{bottom:105px;right:16px;width:calc(100vw - 32px);height:450px;max-height:calc(100vh - 130px);border-radius:16px;border:1px solid ${t.border};box-shadow:0 10px 40px rgba(0,0,0,0.3);transform:translateY(20px) scale(0.95);opacity:0;pointer-events:none}.chat-panel.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}}
        @media(min-width:769px){.chat-panel{top:0;right:-380px;width:380px;height:100vh;border-left:1px solid ${t.border}}.chat-panel.open{right:0;box-shadow:-10px 0 40px rgba(0,0,0,0.2)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── Sidebar ── */}
      <div className={`sidebar ${isNavOpen?'open':''}`} style={{width:220,background:t.surface,borderRight:'1px solid '+t.border,display:'flex',flexDirection:'column',position:'fixed',top:0,bottom:0,left:0,overflowY:'auto'}}>
        <div style={{padding:'18px 16px',borderBottom:'1px solid '+t.border}}>
          <div style={{fontSize:10,color:t.muted,letterSpacing:'2px',textTransform:'uppercase'}}>{team?.team_name||'EMS'}</div>
          <div style={{fontSize:14,fontWeight:700,color:t.text,marginTop:4,lineHeight:1.3}}>Event Management System</div>
          {adminMode&&<span style={{background:'#7c3aed',color:'white',fontSize:10,padding:'2px 8px',borderRadius:20,display:'inline-block',marginTop:6}}>⚡ Admin Mode</span>}
        </div>
        <nav style={{padding:'10px 0'}}>
          {VIEWS.map(v=>(
            <div key={v.id} className="navItem" onClick={()=>{setView(v.id);setIsNavOpen(false);}}
              style={{padding:'10px 16px',cursor:'pointer',fontSize:14,borderLeft:'3px solid '+(view===v.id?t.accent:'transparent'),background:view===v.id?t.accentGlow:'transparent',color:view===v.id?t.accent:t.muted,transition:'all 0.15s'}}>
              {v.label}
            </div>
          ))}
        </nav>
        <div style={{padding:14,borderTop:'1px solid '+t.border,display:'flex',flexDirection:'column',gap:8,marginTop:'auto'}}>
          {!adminMode
            ?<button onClick={()=>{setShowAdminModal(true);setAdminPwInput('');setAdminPwErr(false);setIsNavOpen(false);}} style={{background:'#312e81',color:'#a5b4fc',border:'1px solid #4338ca',borderRadius:8,padding:8,fontSize:12,cursor:'pointer'}}>🔐 Admin Mode</button>
            :<button onClick={()=>{setAdminMode(false);setIsNavOpen(false);}} style={{background:'#1e1b4b',color:'#a5b4fc',border:'1px solid #4338ca',borderRadius:8,padding:8,fontSize:12,cursor:'pointer'}}>🔒 Lock Admin Mode</button>}
          <button onClick={()=>{setPwChangeForm({auth:'',newSite:'',newAdmin:'',newAiRules:''});setShowPasswordChangeModal(true);setIsNavOpen(false);}} style={{background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:8,fontSize:12,cursor:'pointer',color:t.text}}>🔑 Change Passwords</button>
          <button onClick={()=>{setModal('clearData');setIsNavOpen(false);}} style={{background:'transparent',border:'1px solid #ef4444',borderRadius:8,padding:8,fontSize:12,cursor:'pointer',color:'#ef4444'}}>🗑 Clear Data</button>
          <button onClick={handleLogout} style={{background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:8,fontSize:12,cursor:'pointer',color:t.muted}}
            onMouseOver={e=>{e.target.style.background='#ef4444';e.target.style.color='#fff';e.target.style.borderColor='#ef4444';}}
            onMouseOut={e=>{e.target.style.background='transparent';e.target.style.color=t.muted;e.target.style.borderColor=t.border;}}>
            Logout
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className={`main-content ${isNavOpen?'nav-open':''}`} style={{flex:1,padding:24,overflowY:'auto',overflowX:'hidden'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:'1.5rem',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',gap:14}}>
            <button className="menu-btn" onClick={()=>setIsNavOpen(p=>!p)}>{isNavOpen?'✖':'☰'}</button>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
                <div style={{width:8,height:28,background:t.accent,borderRadius:4}}/>
                <h2 style={{margin:0,fontSize:20,fontWeight:500,color:t.text}}>Event Management System <span style={{color:t.accent}}>|</span> {team?.team_name}</h2>
              </div>
              <p style={{margin:'0 0 0 18px',fontSize:13,color:t.muted}}>
                <span style={{color:t.text,fontWeight:500}}>{new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</span>
                <span style={{color:t.muted}}> | </span>
                <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:syncStatus==='live'?'#34D399':syncStatus==='error'?'#ef4444':'#FBBF24',display:'inline-block',boxShadow:syncStatus==='live'?'0 0 6px #34D399':'0 0 6px #FBBF24'}}/>
                  <span style={{fontSize:12,fontWeight:500,color:syncStatus==='live'?'#34D399':syncStatus==='error'?'#ef4444':'#FBBF24'}}>{syncStatus==='live'?'Live sync active':syncStatus==='error'?'Sync error':'Connecting...'}</span>
                </span>
              </p>
            </div>
          </div>
          <ThemeToggle isDark={isDark} onToggle={()=>setIsDark(d=>!d)} t={t}/>
        </div>

        {view!=='messages'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(2, 1fr)',gap:12,marginBottom:20}}>
            {[['Verticals',vArr.length,'🗂️','#3B82F6'],['Resources',oArr.length,'👥','#10b981'],['Tasks Done',doneTasks,'✅','#34D399'],['All Tasks',tArr.length,'📋','#8b5cf6']].map(([l,n,i,c])=>(
              <div key={l} className="statCard" onClick={()=>handleStatClick(l)}
                style={{background:t.card,border:'1px solid '+t.border,borderRadius:12,padding:'14px 16px',borderTop:`3px solid ${c}`,boxShadow:t.shadow}}>
                <div style={{fontSize:26,marginBottom:4}}>{i}</div>
                <div style={{fontSize:28,fontWeight:700,color:t.text}}>{n}</div>
                <div style={{fontSize:13,color:t.muted}}>{l}</div>
                <div style={{fontSize:11,color:c,marginTop:4,opacity:.7}}>Click to view →</div>
              </div>
            ))}
          </div>
        )}

        {/* ── TEAM CHAT ── */}
        {view==='messages'&&(
          <div style={{animation:'fadeIn 0.3s ease',display:'flex',flexDirection:'column',height:'calc(100vh - 120px)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexShrink:0,flexWrap:'wrap',gap:10}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:8,height:28,background:t.accent,borderRadius:4}}/>
                <h2 style={{margin:0,fontSize:19,fontWeight:500,color:t.text}}>Team Chat & File Sharing</h2>
              </div>
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                {adminMode&&teamMessages.length>0&&<button onClick={()=>setModal('clearTeamChat')} style={{background:'transparent',border:'1px solid #ef4444',color:'#ef4444',padding:'6px 12px',borderRadius:8,fontSize:12,cursor:'pointer'}}>🗑️ Clear Chat</button>}
                {username&&<button onClick={()=>{setUsernameInput(username);setUsernameError('');setShowUsernameModal(true);}} style={{background:t.surface,border:'1px solid '+t.border,color:t.text,padding:'6px 12px',borderRadius:8,fontSize:12,cursor:'pointer',boxShadow:t.shadow}}>👤 {username}</button>}
              </div>
            </div>
            <div style={{flex:1,background:t.card,border:'1px solid '+t.border,borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:t.shadow}}>
              <div style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:16}}>
                {teamMessages.length===0?(
                  <div style={{textAlign:'center',padding:'40px 20px',color:t.muted}}><div style={{fontSize:40,marginBottom:12}}>💬</div><div style={{fontSize:15,color:t.text,marginBottom:8}}>No messages yet</div><div style={{fontSize:13}}>Start the conversation or share a file.</div></div>
                ):(
                  teamMessages.map(msg=>{
                    const displaySender=msg.sender_name||msg.sender;
                    const isMe=displaySender===username;
                    const bubbleColor=getColorForName(displaySender);
                    return(
                      <div key={msg.id} style={{alignSelf:isMe?'flex-end':'flex-start',maxWidth:'75%'}}>
                        <div style={{fontSize:11,color:t.muted,marginBottom:4,textAlign:isMe?'right':'left'}}>{displaySender} {msg.sender==='Admin'&&'🛡️'} • {fmtDate(msg.ts)}</div>
                        <div style={{padding:'12px 16px',borderRadius:isMe?'18px 18px 2px 18px':'18px 18px 18px 2px',background:bubbleColor,color:'#fff',fontSize:14,lineHeight:1.5,boxShadow:t.shadow}}>
                          {msg.text&&<div style={{whiteSpace:'pre-wrap',marginBottom:msg.file?10:0}}>{msg.text}</div>}
                          {msg.file&&(
                            <div style={{background:'rgba(255,255,255,0.15)',padding:10,borderRadius:8,display:'flex',alignItems:'center',gap:10}}>
                              <div style={{fontSize:24}}>{msg.file.type?.includes('image')?'🖼️':msg.file.type?.includes('pdf')?'📕':'📄'}</div>
                              <div style={{overflow:'hidden'}}><div style={{fontSize:13,fontWeight:600,whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden'}}>{msg.file.name}</div><a href={msg.file.url} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:'#fff',textDecoration:'underline'}}>Download / View</a></div>
                            </div>
                          )}
                        </div>
                        {adminMode&&<div style={{textAlign:isMe?'right':'left',marginTop:4}}><button onClick={()=>handleDeleteTeamMessage(msg)} style={{background:'transparent',border:'none',color:'#ef4444',fontSize:10,cursor:'pointer'}}>Delete</button></div>}
                      </div>
                    );
                  })
                )}
                <div ref={teamChatEndRef}/>
              </div>
              <div style={{padding:'16px 90px 16px 16px',background:t.surface,borderTop:'1px solid '+t.border,display:'flex',flexDirection:'column',gap:10}}>
                {teamChatFile&&(
                  <div style={{display:'flex',alignItems:'center',gap:10,background:t.bg,padding:'8px 12px',borderRadius:8,width:'fit-content',border:'1px solid '+t.border}}>
                    <span style={{fontSize:12,color:t.text,fontWeight:500}}>{teamChatFile.type?.includes('image')?'📷':'📎'} {teamChatFile.name}</span>
                    <button onClick={()=>{setTeamChatFile(null);if(teamChatFileRef.current)teamChatFileRef.current.value='';if(teamChatCameraRef.current)teamChatCameraRef.current.value='';}} style={{background:'transparent',border:'none',color:'#ef4444',cursor:'pointer',fontSize:12,fontWeight:700}}>✖</button>
                  </div>
                )}
                <div style={{display:'flex',gap:10,alignItems:'flex-end'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <input type="file" ref={teamChatFileRef} onChange={e=>setTeamChatFile(e.target.files[0]||null)} style={{display:'none'}} id="teamChatFileInput" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"/>
                    <label htmlFor="teamChatFileInput" style={{background:t.bg,border:'1px solid '+t.border,color:t.muted,borderRadius:'50%',width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18}} title="Attach file">📎</label>
                    <input type="file" ref={teamChatCameraRef} onChange={e=>setTeamChatFile(e.target.files[0]||null)} style={{display:'none'}} id="teamChatCameraInput" accept="image/*" capture="environment"/>
                    <label htmlFor="teamChatCameraInput" style={{background:t.bg,border:'1px solid '+t.border,color:t.muted,borderRadius:'50%',width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18}} title="Take photo">📷</label>
                  </div>
                  <textarea value={teamChatInput} onChange={e=>setTeamChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSendTeamMessage();}}} placeholder="Type a message or share a document..." style={{flex:1,padding:'12px 16px',borderRadius:22,border:'1px solid '+t.border,background:t.inputBg,color:t.text,fontSize:14,outline:'none',resize:'none',maxHeight:100,minHeight:44,fontFamily:'inherit'} }/>
                  <button onClick={handleSendTeamMessage} disabled={teamChatUploading||(!teamChatInput.trim()&&!teamChatFile)} style={{background:(teamChatInput.trim()||teamChatFile)?t.accent:'transparent',border:(teamChatInput.trim()||teamChatFile)?'none':'1px solid '+t.border,color:(teamChatInput.trim()||teamChatFile)?'#fff':t.muted,borderRadius:'50%',width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',cursor:(teamChatInput.trim()||teamChatFile)?'pointer':'default',transition:'all 0.2s',flexShrink:0}}>
                    {teamChatUploading?'⏳':'➤'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD ── */}
        {view==='dashboard'&&(
          <div style={{animation:'fadeIn 0.3s ease'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:16}}>
              <div style={{background:t.card,border:'1px solid '+t.border,borderRadius:12,padding:20,boxShadow:t.shadow}}>
                <h3 style={{margin:'0 0 16px',fontSize:14,color:t.muted,fontWeight:500}}>Vertical Progress</h3>
                {vArr.map(vt=>{ const vts=tArr.filter(x=>x.vertical_id===vt.id); const pct=vts.length?Math.round(vts.filter(x=>x.status==='done').length/vts.length*100):0; const oc=oArr.filter(x=>x.current_vertical===vt.id).length; return(
                  <div key={vt.id} style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}><span style={{fontSize:14,color:t.text,fontWeight:500}}>{vt.name}</span><span style={{fontSize:12,color:t.muted}}>{oc} personnel · {pct}%</span></div>
                    <div style={{height:6,background:t.bg,borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',borderRadius:4,background:vt.color||t.accent,width:pct+'%',transition:'width 0.4s'}}/></div>
                  </div>
                ); })}
              </div>
              <div style={{background:t.card,border:'1px solid '+t.border,borderRadius:12,padding:20,boxShadow:t.shadow}}>
                <h3 style={{margin:'0 0 16px',fontSize:14,color:t.muted,fontWeight:500}}>Recent Personnel Movements</h3>
                {movements.length===0?<p style={{color:t.muted,fontSize:13}}>No movements yet.</p>:movements.slice(0,6).map(m=>(
                  <div key={m.id} style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
                    <div style={{width:30,height:30,borderRadius:'50%',background:t.accentGlow,border:'1px solid '+t.accent,display:'grid',placeItems:'center',fontSize:14,flexShrink:0}}>👤</div>
                    <div><div style={{fontSize:13,color:t.text,fontWeight:500}}>{m.officer_name}</div><div style={{fontSize:11,color:t.muted}}>{verticals[m.from_vertical]?.name||m.from_vertical} → {verticals[m.to_vertical]?.name||m.to_vertical} · {m.moved_by||'User'}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── VERTICALS ── */}
        {view==='verticals'&&(
          <div style={{animation:'fadeIn 0.3s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:8,height:28,background:t.accent,borderRadius:4}}/><h2 style={{margin:0,fontSize:19,fontWeight:500,color:t.text}}>Verticals</h2></div>
              <button onClick={()=>{setVForm({name:'',lead:'',status:'active'});setModalData({});setModal('verticalForm');}} style={{background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:500,cursor:'pointer'}}>+ Add Vertical</button>
            </div>
            <p style={{margin:'0 0 20px 18px',fontSize:12,color:t.muted}}>Click any vertical card to view its task chain.</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:20}}>
              {vArr.map(vt=>{ const vo=oArr.filter(x=>x.current_vertical===vt.id); const vr=rArr.filter(x=>x.current_vertical===vt.id); const vts=tArr.filter(x=>x.vertical_id===vt.id); const done=vts.filter(x=>x.status==='done').length; const pct=vts.length?Math.round(done/vts.length*100):0; return(
                <div key={vt.id} className="vcard" onClick={()=>openVerticalTasks(vt.id)} style={{background:t.card,border:'1px solid '+t.border,borderRadius:12,borderTop:`4px solid ${vt.color||t.accent}`,boxShadow:t.shadow,transition:'all 0.15s',position:'relative'}}>
                  <div style={{padding:20}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:10}}>
                      <div><div style={{fontSize:16,fontWeight:600,color:t.text}}>{vt.name}</div><div style={{fontSize:12,color:t.muted,marginTop:2}}>Lead: {vt.lead}</div></div>
                      <div style={{display:'flex',gap:6}} onClick={e=>e.stopPropagation()}>
                        <button onClick={()=>{setVForm({name:vt.name,lead:vt.lead,status:vt.status});setModalData({id:vt.id});setModal('verticalForm');}} style={{background:'transparent',border:'1px solid '+t.border,borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer',color:t.muted}}>Edit</button>
                        <button onClick={()=>{setModalData({col:'sd_verticals',id:vt.id});setModal('deleteConfirm');}} style={{background:'transparent',border:'1px solid #ef4444',borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer',color:'#ef4444'}}>Del</button>
                      </div>
                    </div>
                    <div style={{fontSize:13,color:t.muted,marginBottom:10}}>👥 {vo.length} personnel &nbsp;📦 {vr.length} resources &nbsp;✅ {done}/{vts.length} tasks</div>
                    <div style={{height:4,background:t.bg,borderRadius:4,overflow:'hidden',marginBottom:10}}><div style={{height:'100%',borderRadius:4,background:vt.color||t.accent,width:pct+'%',transition:'width 0.4s'}}/></div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>{vo.slice(0,4).map(o=><span key={o.id} style={{background:t.bg,color:t.muted,fontSize:11,padding:'2px 8px',borderRadius:12,display:'inline-block',margin:2}}>{o.name}</span>)}{vo.length>4&&<span style={{fontSize:11,color:t.muted}}> +{vo.length-4}</span>}</div>
                      <span style={{fontSize:11,color:vt.color||t.accent,fontWeight:500}}>View tasks →</span>
                    </div>
                  </div>
                </div>
              ); })}
            </div>
          </div>
        )}

        {/* ── RESOURCES (Officers & Equipment) ── */}
        {view==='resources'&&(
          <div style={{animation:'fadeIn 0.3s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:8,height:28,background:t.accent,borderRadius:4}}/><h2 style={{margin:0,fontSize:19,fontWeight:500,color:t.text}}>Resources & Personnel</h2></div>
              <div style={{display:'flex', gap: 10, flexWrap:'wrap', justifyContent:'flex-end'}}>
                <button onClick={()=>{setOForm({name:'',designation:'',contact:'',current_vertical:'',origin_station:'',deployment_duration:''});setModalData({});setModal('officerForm');}} style={{background:t.surface,color:t.text,border:'1px solid '+t.border,borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:500,cursor:'pointer'}}>+ Add Personnel</button>
                <button onClick={()=>{setRForm({name:'',quantity:1,current_vertical:''});setModalData({});setModal('resourceForm');}} style={{background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:500,cursor:'pointer'}}>+ Add Resource</button>
              </div>
            </div>

            {(()=>{
              const unassignedO = oArr.filter(o=>!o.current_vertical);
              const unassignedR = rArr.filter(r=>!r.current_vertical);
              const groups=vArr.map(v=>({...v,officers:oArr.filter(o=>o.current_vertical===v.id), resources:rArr.filter(r=>r.current_vertical===v.id)}));
              if(unassignedO.length>0 || unassignedR.length>0) groups.push({id:'unassigned',name:'Unassigned',color:t.muted,officers:unassignedO, resources:unassignedR});

              return groups.filter(g=>g.officers.length>0 || g.resources.length>0).map(vt=>(
                <div key={vt.id} style={{marginBottom:32}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}><div style={{width:4,height:20,background:vt.color||t.accent,borderRadius:2}}/><h3 style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}>{vt.name}</h3><span style={{fontSize:12,color:t.muted}}>{vt.officers.length} personnel, {vt.resources.length} resource entries</span></div>
                  
                  <div style={{display:'flex', flexDirection:'column', gap: 16}}>
                    {/* PERSONNEL SECTION */}
                    {vt.officers.length > 0 && (
                      <div style={{background:t.card,border:'1px solid '+t.border,borderRadius:12,overflow:'hidden',boxShadow:t.shadow}}>
                        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
                          <thead>
                            <tr style={{background:t.bg}}>
                              {['Personnel Name','Designation','Origin & Duration','Move To','Actions'].map((h, i)=>(
                                <th key={h} style={{width:i===0?'25%':i===1?'20%':i===2?'25%':i===3?'15%':'15%',padding:'11px 14px',textAlign:'left',fontSize:11,color:t.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {vt.officers.map((o,i)=>(
                              <tr key={o.id} style={{borderTop:'1px solid '+t.border,background:i%2===0?'transparent':t.surface}}>
                                <td style={{padding:'11px 14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <div style={{width:30,height:30,borderRadius:'50%',background:t.accentGlow,border:'1px solid '+t.accent,display:'grid',placeItems:'center',fontSize:11,fontWeight:600,color:t.accent,flexShrink:0}}>{o.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                                    <span style={{fontSize:13,fontWeight:500,color:t.text}}>{o.name}</span>
                                  </div>
                                </td>
                                <td style={{padding:'11px 14px',fontSize:13,color:t.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  <div>{o.designation}</div>
                                </td>
                                <td style={{padding:'11px 14px',fontSize:13,color:t.muted,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  {o.origin_station&&<div>📍 {o.origin_station}</div>}
                                  {o.deployment_duration&&<div style={{marginTop:2}}>⏱ {o.deployment_duration}</div>}
                                </td>
                                <td style={{padding:'11px 14px'}}>
                                  <select onChange={e=>handleQuickMove(o.id,e.target.value)} defaultValue="" style={{...inp,width:'100%',padding:'4px 8px',fontSize:12}}>
                                    <option value="">Move to...</option>
                                    {vArr.filter(v=>v.id!==o.current_vertical).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                                  </select>
                                </td>
                                <td style={{padding:'11px 14px',whiteSpace:'nowrap'}}>
                                  <button onClick={()=>{setOForm({name:o.name,designation:o.designation,contact:o.contact||'',current_vertical:o.current_vertical,origin_station:o.origin_station||'',deployment_duration:o.deployment_duration||''});setModalData({id:o.id});setModal('officerForm');}} style={{background:'transparent',border:'1px solid '+t.border,borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer',color:t.muted,marginRight:6}}>Edit</button>
                                  <button onClick={()=>{setModalData({col:'sd_officers',id:o.id});setModal('deleteConfirm');}} style={{background:'transparent',border:'1px solid #ef4444',borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer',color:'#ef4444'}}>Del</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* RESOURCES SECTION */}
                    {vt.resources.length > 0 && (
                      <div style={{background:t.card,border:'1px dashed '+t.border,borderRadius:12,overflow:'hidden',boxShadow:t.shadow}}>
                        <table style={{width:'100%',borderCollapse:'collapse',tableLayout:'fixed'}}>
                          <thead>
                            <tr style={{background:t.bg}}>
                              {['Resource / Equipment','Quantity','Move To','Actions'].map((h, i)=>(
                                <th key={h} style={{width:i===0?'30%':i===1?'30%':i===2?'25%':'15%',padding:'11px 14px',textAlign:'left',fontSize:11,color:t.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {vt.resources.map((r,i)=>(
                              <tr key={r.id} style={{borderTop:'1px solid '+t.border,background:i%2===0?'transparent':t.surface}}>
                                <td style={{padding:'11px 14px',fontSize:13,fontWeight:500,color:t.text}}>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <div style={{width:30,height:30,borderRadius:'50%',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',display:'grid',placeItems:'center',fontSize:12,flexShrink:0}}>📦</div>
                                    {r.name}
                                  </div>
                                </td>
                                <td style={{padding:'11px 14px'}}>
                                  {/* Select Input for drag-down up to 200 */}
                                  <select value={r.quantity} onChange={e=>handleUpdateQuantity(r.id, e.target.value)} style={{...inp, width: 80, padding: '4px 8px', fontSize:13}}>
                                    {[...Array(201).keys()].map(n => <option key={n} value={n}>{n}</option>)}
                                  </select>
                                </td>
                                <td style={{padding:'11px 14px'}}>
                                  <select onChange={e=>handleQuickMoveResource(r.id,e.target.value)} defaultValue="" style={{...inp,width:'100%',padding:'4px 8px',fontSize:12}}>
                                    <option value="">Move to...</option>
                                    {vArr.filter(v=>v.id!==r.current_vertical).map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
                                  </select>
                                </td>
                                <td style={{padding:'11px 14px',whiteSpace:'nowrap'}}>
                                  <button onClick={()=>{setRForm({name:r.name,quantity:r.quantity,current_vertical:r.current_vertical});setModalData({id:r.id});setModal('resourceForm');}} style={{background:'transparent',border:'1px solid '+t.border,borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer',color:t.muted,marginRight:6}}>Edit</button>
                                  <button onClick={()=>{setModalData({col:'sd_resources',id:r.id});setModal('deleteConfirm');}} style={{background:'transparent',border:'1px solid #ef4444',borderRadius:6,padding:'3px 10px',fontSize:11,cursor:'pointer',color:'#ef4444'}}>Del</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}

        {/* ── TASKS ── */}
        {view==='tasks'&&(
          <div style={{animation:'fadeIn 0.3s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:10}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:8,height:28,background:t.accent,borderRadius:4}}/><h2 style={{margin:0,fontSize:19,fontWeight:500,color:t.text}}>Task Chains</h2></div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                {[['all','All'],['in-progress','In Progress'],['done','Done'],['pending','Pending']].map(([k,l])=>(
                  <button key={k} onClick={()=>setTaskFilter(k)} style={{background:taskFilter===k?t.accentGlow:'transparent',border:'1px solid '+(taskFilter===k?t.accent:t.border),borderRadius:20,padding:'5px 14px',fontSize:12,cursor:'pointer',color:taskFilter===k?t.accent:t.muted,fontWeight:taskFilter===k?500:400}}>{l}</button>
                ))}
                <button onClick={()=>{setTForm({title:'',description:'',goal:'',task_order:1,vertical_id:taskVerticalFilter!=='all'?taskVerticalFilter:'',assigned_officer:'',status:'pending'});setModalData({});setModal('taskForm');}} style={{background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:500,cursor:'pointer',marginLeft:4}}>+ Add Task</button>
              </div>
            </div>
            <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
              <button onClick={()=>setTaskVerticalFilter('all')} style={{background:taskVerticalFilter==='all'?t.accentGlow:'transparent',border:'1px solid '+(taskVerticalFilter==='all'?t.accent:t.border),borderRadius:20,padding:'4px 14px',fontSize:12,cursor:'pointer',color:taskVerticalFilter==='all'?t.accent:t.muted}}>All Verticals</button>
              {vArr.map(vt=><button key={vt.id} onClick={()=>setTaskVerticalFilter(vt.id)} style={{background:taskVerticalFilter===vt.id?(vt.color||t.accent)+'22':'transparent',border:'1px solid '+(taskVerticalFilter===vt.id?vt.color||t.accent:t.border),borderRadius:20,padding:'4px 14px',fontSize:12,cursor:'pointer',color:taskVerticalFilter===vt.id?vt.color||t.accent:t.muted,fontWeight:taskVerticalFilter===vt.id?500:400}}>{vt.name}</button>)}
            </div>
            {vArr.filter(vt => taskVerticalFilter === 'all' || vt.id === taskVerticalFilter).map(vt=>{
              const vtasks=filteredTasks.filter(x=>x.vertical_id===vt.id).sort((a,b)=>(a.task_order||0)-(b.task_order||0));
              const allDone=tArr.filter(x=>x.vertical_id===vt.id&&x.status==='done').length;
              const allTotal=tArr.filter(x=>x.vertical_id===vt.id).length;
              return(
                <div key={vt.id} style={{background:t.card,border:'1px solid '+t.border,borderRadius:12,marginBottom:20,boxShadow:t.shadow}}>
                  <div style={{padding:'14px 20px',borderBottom:'1px solid '+t.border,borderLeft:`4px solid ${vt.color||t.accent}`,display:'flex',justifyContent:'space-between',alignItems:'center',background:t.surface}}>
                    <div><span style={{fontSize:15,fontWeight:600,color:t.text}}>{vt.name}</span><span style={{fontSize:12,color:t.muted,marginLeft:12}}>Goal: {vtasks[0]?.goal||''}</span></div>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      {copiedTask&&<button onClick={()=>handlePasteTask(vt.id,null)} className="paste-btn" style={{background:t.accentGlow,color:t.accent,border:'1px dashed '+t.accent,borderRadius:16,padding:'4px 12px',fontSize:11,fontWeight:600,cursor:'pointer',transition:'all 0.15s'}}>📋 Paste at End</button>}
                      <span style={{fontSize:12,color:t.muted}}>{allDone}/{allTotal} complete</span>
                    </div>
                  </div>
                  <div className="h-scroll-container" style={{padding:16,overflowX:'auto',minHeight:100,transition:'background 0.2s',display:'flex',alignItems:window.innerWidth<=768?'flex-start':'center',flexWrap:window.innerWidth<=768?'wrap':'nowrap',gap:window.innerWidth<=768?12:0}}>
                    data-verticalid={vt.id}
                    onDragEnter={e=>e.preventDefault()}
                    onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';if(dropTargetRef.current.verticalId!==vt.id||dropTargetRef.current.taskId!==null){dropTargetRef.current={verticalId:vt.id,taskId:null};setDropTarget({verticalId:vt.id,taskId:null});}}}
                    onDrop={e=>{e.preventDefault();handleDropAction(e,vt.id,null);}}>
                    {vtasks.length===0?(
                      <div style={{position:'relative',width:'100%',height:110,display:'flex',alignItems:'center'}}>
                        {copiedTask?<button onClick={()=>handlePasteTask(vt.id,null)} className="paste-btn" style={{background:t.accentGlow,color:t.accent,border:`2px dashed ${t.accent}`,borderRadius:10,padding:'10px 20px',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.2s'}}>📋 Paste Here</button>:<div style={{color:t.muted,fontSize:13,fontStyle:'italic',position:'absolute',left:0,pointerEvents:'none'}}>No tasks. Drop tasks here or add one.</div>}
                        <div data-verticalid={vt.id} style={{width:(dropTarget.verticalId===vt.id&&!copiedTask)?170:0,opacity:(dropTarget.verticalId===vt.id&&!copiedTask)?1:0,transition:'all 0.25s',overflow:'hidden',height:100,zIndex:1}}><div style={{width:160,height:100,border:`2px dashed ${t.accent}`,borderRadius:10,background:t.accentGlow}}/></div>
                      </div>
                    ):(
                      <div style={{display:'flex',alignItems:'center',minWidth:'max-content',gap:0}}>
                        {vtasks.map((tk,i)=>{
                          const of=officers[tk.assigned_officer];
                          const sc=SC[tk.status]||{bg:'#1e293b',text:'#94a3b8'};
                          const isDropTarget=dropTarget.verticalId===vt.id&&dropTarget.taskId===tk.id;
                          const isDragged=draggedTaskIdRef.current===tk.id;
                          return(
                            <Fragment key={tk.id}>
                              {copiedTask&&<div style={{padding:'0 8px',display:'flex',alignItems:'center'}}><button onClick={()=>handlePasteTask(vt.id,tk.id)} className="paste-btn" style={{background:t.accentGlow,color:t.accent,border:`1px dashed ${t.accent}`,borderRadius:16,padding:'4px 10px',fontSize:11,cursor:'pointer',fontWeight:600,whiteSpace:'nowrap',transition:'all 0.2s'}}>+ Paste</button></div>}
                              
                              {/* ── PLACEHOLDER BEFORE TASK ── */}
                              <div data-taskid={tk.id} data-verticalid={vt.id} style={{width:(isDropTarget&&!isDragged&&!copiedTask)?195:0,opacity:(isDropTarget&&!isDragged&&!copiedTask)?1:0,transition:'all 0.25s',overflow:'hidden',display:'flex',alignItems:'center'}}>
                                <div style={{width:160,height:100,border:`2px dashed ${t.accent}`,borderRadius:10,background:t.accentGlow,flexShrink:0,margin:'0 8px'}}/>
                                <div style={{color:t.muted,fontSize:18,padding:'0 8px'}}>──▶</div>
                              </div>
                              
                              {/* ── TASK CARD (POINTER-BASED DRAG) ── */}
                              <div
                                data-taskid={tk.id}
                                data-verticalid={vt.id}
                                onPointerDown={e => startPointerDrag(e, tk, vt)}
                                style={{
  background:t.bg, border:`2px solid ${copiedTask?.id===tk.id?t.accent:sc.text}`, borderRadius:10, padding:'12px 14px', position:'relative', minWidth:window.innerWidth<=768?'calc(100% - 4px)':'160px', maxWidth:window.innerWidth<=768?'100%':'195px', width:window.innerWidth<=768?'100%':'auto', flexShrink:0, cursor:'grab', transition:'all 0.2s', userSelect:'none', touchAction:'none',
  opacity:draggedTask?.id===tk.id?0.3:1, transform:draggedTask?.id===tk.id?'scale(0.95)':'scale(1)'
}}>
                                <button onClick={()=>{copiedTask?.id===tk.id?setCopiedTask(null):setCopiedTask(tk);}} style={{position:'absolute',top:-8,right:-8,background:copiedTask?.id===tk.id?t.accent:t.surface,border:'1px solid '+(copiedTask?.id===tk.id?t.accent:t.border),borderRadius:12,padding:'4px 10px',fontSize:10,fontWeight:600,cursor:'pointer',color:copiedTask?.id===tk.id?'#fff':t.muted,transition:'all 0.2s',boxShadow:t.shadow,zIndex:10}}>{copiedTask?.id===tk.id?'Cancel copy':'Copy task'}</button>
                                <div style={{fontSize:10,color:sc.text,fontWeight:600,marginBottom:3}}>{SL[tk.status]}</div>
                                <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:3}}>{tk.title}</div>
                                <div style={{fontSize:11,color:t.muted,marginBottom:8}}>{of?.name||'Unassigned'}</div>
                                <div style={{display:'flex',gap:3,marginBottom:7,flexWrap:'wrap'}}>
  {['pending','in-progress','done'].map(s=><button key={s} onClick={()=>adminMode&&handleTaskStatus(tk.id,s)} style={{fontSize:9,padding:'2px 5px',background:tk.status===s?sc.text+'33':'transparent',color:tk.status===s?sc.text:t.muted,border:`1px solid ${tk.status===s?sc.text:t.border}`,borderRadius:4,cursor:adminMode?'pointer':'not-allowed',opacity:adminMode?1:0.4}}>{s==='in-progress'?'In Prog':s.charAt(0).toUpperCase()+s.slice(1)}</button>)}
</div>

                                <div style={{display:'flex',gap:4}}>
                                  <button onClick={()=>{setTForm({title:tk.title,description:tk.description||'',goal:tk.goal||'',task_order:tk.task_order||1,vertical_id:tk.vertical_id,assigned_officer:tk.assigned_officer||'',status:tk.status});setModalData({id:tk.id});setModal('taskForm');}} style={{background:'transparent',border:'1px solid '+t.border,borderRadius:4,padding:'2px 8px',fontSize:9,cursor:'pointer',color:t.muted}}>Edit</button>
                                  <button onClick={()=>{setModalData({col:'sd_tasks',id:tk.id});setModal('deleteConfirm');}} style={{background:'transparent',border:'1px solid #ef4444',borderRadius:4,padding:'2px 8px',fontSize:9,cursor:'pointer',color:'#ef4444'}}>Del</button>
                                </div>
                              </div>
                              {!copiedTask&&i<vtasks.length-1&&<div style={{color:t.muted,fontSize:window.innerWidth<=768?14:18,padding:window.innerWidth<=768?'4px 0':'0 8px',flexShrink:0,transform:window.innerWidth<=768?'rotate(90deg)':'none',alignSelf:'center',width:window.innerWidth<=768?'100%':'auto',textAlign:'center'}}>──▶</div>}
                            </Fragment>
                          );
                        })}
                        
                        {/* ── END OF LIST PLACEHOLDER ── */}
                        {(()=>{
                          const isLastTaskDragged = draggedTaskIdRef.current === vtasks[vtasks.length - 1]?.id;
                          const showEndPlaceholder = dropTarget.verticalId === vt.id && dropTarget.taskId === null && !copiedTask && !isLastTaskDragged;
                          return (
                            <div data-verticalid={vt.id} style={{width: showEndPlaceholder ? 195 : 0, opacity: showEndPlaceholder ? 1 : 0, transition:'all 0.25s', overflow:'hidden', display:'flex', alignItems:'center'}}>
                              <div style={{color:t.muted,fontSize:18,padding:'0 8px'}}>──▶</div>
                              <div style={{width:160,height:100,border:`2px dashed ${t.accent}`,borderRadius:10,background:t.accentGlow,flexShrink:0,margin:'0 8px'}}/>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MOVEMENTS ── */}
        {view==='movements'&&(
          <div style={{animation:'fadeIn 0.3s ease'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}><div style={{width:8,height:28,background:t.accent,borderRadius:4}}/><h2 style={{margin:0,fontSize:19,fontWeight:500,color:t.text}}>Movement Log</h2></div>
            <div style={{background:t.card,border:'1px solid '+t.border,borderRadius:12,overflow:'hidden',boxShadow:t.shadow}}>
              {movements.length===0?<div style={{padding:40,textAlign:'center',color:t.muted,fontSize:14}}>No movements recorded yet.</div>:(
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead><tr style={{background:t.bg}}>{['Personnel','From','To','Moved By','Time'].map(h=><th key={h} style={{padding:'11px 14px',textAlign:'left',fontSize:11,color:t.muted,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{h}</th>)}</tr></thead>
                  <tbody>{movements.map((m,i)=>(
                    <tr key={m.id} style={{borderTop:'1px solid '+t.border,background:i%2===0?'transparent':t.surface}}>
                      <td style={{padding:'11px 14px',fontSize:13,fontWeight:500,color:t.text}}>{m.officer_name}</td>
                      <td style={{padding:'11px 14px',fontSize:13,color:'#ef4444'}}>{verticals[m.from_vertical]?.name||m.from_vertical}</td>
                      <td style={{padding:'11px 14px',fontSize:13,color:'#34D399'}}>{verticals[m.to_vertical]?.name||m.to_vertical}</td>
                      <td style={{padding:'11px 14px',fontSize:13,color:t.muted}}>{m.moved_by||'User'}</td>
                      <td style={{padding:'11px 14px',fontSize:12,color:t.muted}}>{fmtDate(m.ts)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── ORDERS ── */}
        {view==='orders'&&(
          <div style={{animation:'fadeIn 0.3s ease'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:8,height:28,background:t.accent,borderRadius:4}}/><h2 style={{margin:0,fontSize:19,fontWeight:500,color:t.text}}>Issued Orders</h2></div>
              <span style={{fontSize:13,color:t.muted}}>{orders.length} order{orders.length!==1?'s':''}</span>
            </div>
            {adminMode?(
              <div style={{background:t.card,border:'1px solid '+t.accent,borderRadius:12,padding:20,marginBottom:24,boxShadow:`0 0 20px ${t.accentGlow}`}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}><span style={{background:t.accentGlow,border:'1px solid '+t.accent,color:t.accent,fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:6,textTransform:'uppercase'}}>Admin</span><h3 style={{margin:0,fontSize:14,fontWeight:600,color:t.text}}>Upload New Order</h3></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Order Title</label><input value={orderTitle} onChange={e=>setOrderTitle(e.target.value)} placeholder="e.g. Transfer Order No. 123/2025" style={inp}/></div>
                  <div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Division</label><select value={orderDivision} onChange={e=>setOrderDivision(e.target.value)} style={inp}><option value="">Select Division...</option>{vArr.map(v=><option key={v.id} value={v.name}>{v.name}</option>)}</select></div>
                </div>
                <div style={{marginBottom:14}}><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>PDF File</label><input ref={fileInputRef} type="file" accept=".pdf" onChange={e=>setOrderFile(e.target.files[0]||null)} style={{...inp,padding:'7px 11px',cursor:'pointer'}}/>{orderFile&&<div style={{fontSize:11,color:t.muted,marginTop:4}}>📄 {orderFile.name} · {fmtSize(orderFile.size)}</div>}</div>
                {orderUploading&&<div style={{marginBottom:12}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontSize:12,color:t.muted}}>Uploading...</span><span style={{fontSize:12,color:t.accent,fontWeight:500}}>{orderProgress}%</span></div><div style={{height:6,background:t.bg,borderRadius:4,overflow:'hidden'}}><div style={{height:'100%',background:t.accent,borderRadius:4,width:orderProgress+'%',transition:'width 0.3s'}}/></div></div>}
                <button onClick={handleUploadOrder} disabled={orderUploading||!orderFile||!orderTitle.trim()||!orderDivision} style={{background:orderFile&&orderTitle.trim()&&orderDivision&&!orderUploading?t.accent:'#334155',color:'#fff',border:'none',borderRadius:8,padding:'9px 20px',fontSize:13,fontWeight:500,cursor:orderFile&&orderTitle.trim()&&orderDivision&&!orderUploading?'pointer':'default',transition:'background 0.2s'}}>{orderUploading?'Uploading...':'Upload Order'}</button>
              </div>
            ):(
              <div style={{background:t.surface,border:'1px solid '+t.border,borderRadius:12,padding:'14px 18px',marginBottom:24,display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:20}}>🔐</span><span style={{fontSize:13,color:t.muted}}>Enable Admin Mode to upload orders.</span>
              </div>
            )}
            <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
              <button onClick={()=>setOrdersFilter('all')} style={{background:ordersFilter==='all'?t.accentGlow:'transparent',border:'1px solid '+(ordersFilter==='all'?t.accent:t.border),borderRadius:20,padding:'4px 14px',fontSize:12,cursor:'pointer',color:ordersFilter==='all'?t.accent:t.muted}}>All Divisions</button>
              {[...new Set(orders.map(o=>o.division))].sort().map(div=><button key={div} onClick={()=>setOrdersFilter(div)} style={{background:ordersFilter===div?t.accentGlow:'transparent',border:'1px solid '+(ordersFilter===div?t.accent:t.border),borderRadius:20,padding:'4px 14px',fontSize:12,cursor:'pointer',color:ordersFilter===div?t.accent:t.muted}}>{div}</button>)}
            </div>
            {orders.length===0?(
              <div style={{background:t.card,border:'1px solid '+t.border,borderRadius:12,padding:40,textAlign:'center',boxShadow:t.shadow}}><div style={{fontSize:40,marginBottom:12}}>📄</div><div style={{fontSize:15,color:t.text,marginBottom:6}}>No orders uploaded yet</div><div style={{fontSize:13,color:t.muted}}>{adminMode?'Use the upload panel above.':'Enable Admin Mode to upload orders.'}</div></div>
            ):(()=>{
              const filtered=ordersFilter==='all'?orders:orders.filter(o=>o.division===ordersFilter);
              const grouped={}; filtered.forEach(o=>{if(!grouped[o.division])grouped[o.division]=[];grouped[o.division].push(o);});
              return Object.keys(grouped).sort().map(div=>{ const vtColor=vArr.find(v=>v.name===div)?.color||t.accent; return(
                <div key={div} style={{marginBottom:24}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}><div style={{width:4,height:20,background:vtColor,borderRadius:2}}/><h3 style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}>{div}</h3><span style={{fontSize:12,color:t.muted}}>{grouped[div].length} order{grouped[div].length!==1?'s':''}</span></div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {grouped[div].map((order,idx)=>(
                      <div key={order.id} className="jcard" style={{background:t.card,border:'1px solid '+t.border,borderRadius:10,padding:'14px 18px',display:'flex',alignItems:'center',gap:14,boxShadow:t.shadow,transition:'border-color 0.15s'}}>
                        <div style={{width:28,height:28,borderRadius:'50%',background:vtColor+'22',border:'1px solid '+vtColor+'44',display:'grid',placeItems:'center',fontSize:12,fontWeight:600,color:vtColor,flexShrink:0}}>{idx+1}</div>
                        <div style={{width:36,height:36,borderRadius:8,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',display:'grid',placeItems:'center',fontSize:18,flexShrink:0}}>📕</div>
                        <div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:600,color:t.text,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{order.title}</div><div style={{display:'flex',gap:12,fontSize:12,color:t.muted,flexWrap:'wrap'}}><span>📁 {order.file_name}</span>{order.file_size&&<span>{fmtSize(order.file_size)}</span>}<span>📅 {fmtDate(order.uploaded_at)}</span></div></div>
                        <div style={{display:'flex',gap:8,flexShrink:0}}>
                          <button onClick={()=>setViewPdf(order)} style={{background:t.accentGlow,color:t.accent,border:'1px solid '+t.accent,borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer'}}>↗ View</button>
                          {adminMode&&<button onClick={()=>{setModalData({order});setModal('deleteOrder');}} style={{background:'transparent',border:'1px solid #ef4444',borderRadius:7,padding:'6px 14px',fontSize:12,cursor:'pointer',color:'#ef4444',fontWeight:500}}>Delete</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ); });
            })()}
          </div>
        )}
      </div>

      {/* ══ MODALS ══ */}
      {showUsernameModal&&<Modal t={t} onClose={()=>{setShowUsernameModal(false);if(!username)setView('dashboard');}}><ModalHeader icon="👤" title={username?'Change Username':'Set Your Username'} subtitle="This name will appear on all your team chat messages." t={t}/><div style={{display:'flex',flexDirection:'column',gap:12}}><input type="text" value={usernameInput} onChange={e=>{setUsernameInput(e.target.value);setUsernameError('');}} placeholder="e.g. Rahul_IFS" autoFocus style={{...inp,fontSize:15,padding:'12px',border:'1px solid '+(usernameError?'#ef4444':t.border)}}/>{usernameError&&<p style={{margin:'0',fontSize:12,color:'#ef4444',textAlign:'center'}}>{usernameError}</p>}<div style={{display:'flex',gap:8,marginTop:8}}><button onClick={handleSaveUsername} style={{flex:1,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>{username?'Update Name':'Join Chat'}</button><button onClick={()=>{setShowUsernameModal(false);if(!username)setView('dashboard');}} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button></div></div></Modal>}
      {showAdminModal&&<Modal t={t} onClose={()=>setShowAdminModal(false)}><ModalHeader icon="⚡" title="Admin Mode" subtitle="Unlocks AI agentic capabilities and order uploads." t={t}/><input type="password" value={adminPwInput} onChange={e=>{setAdminPwInput(e.target.value);setAdminPwErr(false);}} onKeyDown={e=>e.key==='Enter'&&handleAdminUnlock()} placeholder="Admin password" autoFocus style={{...inp,textAlign:'center',fontSize:16,letterSpacing:4,marginBottom:8,border:'1px solid '+(adminPwErr?'#ef4444':t.border)}}/>{adminPwErr&&<p style={{margin:'0 0 12px',fontSize:12,color:'#ef4444',textAlign:'center'}}>Incorrect password.</p>}<div style={{display:'flex',gap:8}}><button onClick={handleAdminUnlock} style={{flex:1,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Unlock</button><button onClick={()=>setShowAdminModal(false)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button></div></Modal>}
      {showPasswordChangeModal&&<Modal t={t} onClose={()=>setShowPasswordChangeModal(false)}><ModalHeader icon="🔑" title="Change Passwords" subtitle={`Update passwords for ${team?.team_name}. Requires Current Admin Password.`} t={t}/><div style={{display:'flex',flexDirection:'column',gap:12}}><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Current Admin Password (Required)</label><input type="password" value={pwChangeForm.auth} onChange={e=>setPwChangeForm(f=>({...f,auth:e.target.value}))} placeholder="Verify authorization..." style={inp}/></div><hr style={{border:'none',borderTop:'1px solid '+t.border,margin:'4px 0'}}/><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>New Site Password</label><input type="text" value={pwChangeForm.newSite} onChange={e=>setPwChangeForm(f=>({...f,newSite:e.target.value}))} placeholder="Leave blank to keep current" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>New Admin Password</label><input type="text" value={pwChangeForm.newAdmin} onChange={e=>setPwChangeForm(f=>({...f,newAdmin:e.target.value}))} placeholder="Leave blank to keep current" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>New AI Rules Password</label><input type="text" value={pwChangeForm.newAiRules} onChange={e=>setPwChangeForm(f=>({...f,newAiRules:e.target.value}))} placeholder="Leave blank to keep current" style={inp}/></div><div style={{display:'flex',gap:8,marginTop:8}}><button onClick={handlePasswordChangeSubmit} disabled={!pwChangeForm.auth} style={{flex:1,background:pwChangeForm.auth?t.accent:'#334155',color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:pwChangeForm.auth?'pointer':'default'}}>Save Changes</button><button onClick={()=>setShowPasswordChangeModal(false)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button></div></div></Modal>}
      {showAiRulesAuthModal&&<Modal t={t} onClose={()=>setShowAiRulesAuthModal(false)}><ModalHeader icon="⚙️" title="AI Configuration" subtitle="Enter the Rules password to configure system prompts." t={t}/><input type="password" value={aiRulesPwInput} onChange={e=>{setAiRulesPwInput(e.target.value);setAiRulesPwErr(false);}} onKeyDown={e=>e.key==='Enter'&&handleAiRulesUnlock()} placeholder="Rules password" autoFocus style={{...inp,textAlign:'center',fontSize:16,letterSpacing:4,marginBottom:8,border:'1px solid '+(aiRulesPwErr?'#ef4444':t.border)}}/>{aiRulesPwErr&&<p style={{margin:'0 0 12px',fontSize:12,color:'#ef4444',textAlign:'center'}}>Incorrect password.</p>}<div style={{display:'flex',gap:8}}><button onClick={handleAiRulesUnlock} style={{flex:1,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Unlock Rules</button><button onClick={()=>setShowAiRulesAuthModal(false)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button></div></Modal>}
      {showAiRulesModal&&<Modal t={t} onClose={()=>setShowAiRulesModal(false)}><ModalHeader icon="🧠" title="Custom AI Rules" subtitle="Inject hidden system instructions for the AI agent." t={t}/><div style={{display:'flex',flexDirection:'column',gap:12}}><textarea value={customAiRules} onChange={e=>setCustomAiRules(e.target.value)} placeholder="e.g., Always reply using bullet points. Prioritize Protocol tasks." style={{...inp,height:120,resize:'vertical',fontFamily:'monospace',fontSize:12}}/><button onClick={()=>setShowAiRulesModal(false)} style={{flex:1,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Save & Close</button></div></Modal>}
      {modal==='verticalForm'&&<Modal t={t} onClose={()=>setModal(null)}><ModalHeader icon="🗂️" title={(modalData.id?'Edit':'Add')+' Vertical'} t={t}/><div style={{display:'flex',flexDirection:'column',gap:12}}><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Name</label><input value={vForm.name} onChange={e=>setVForm(f=>({...f,name:e.target.value}))} placeholder="Vertical name" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Lead Officer</label><input value={vForm.lead} onChange={e=>setVForm(f=>({...f,lead:e.target.value}))} placeholder="Lead officer name" style={inp}/></div><div style={{display:'flex',gap:8,marginTop:8}}><button onClick={saveVertical} style={{flex:1,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Save</button><button onClick={()=>setModal(null)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button></div></div></Modal>}
      
      {/* Officer Modal */}
      {modal==='officerForm'&&<Modal t={t} onClose={()=>setModal(null)}><ModalHeader icon="👤" title={(modalData.id?'Edit':'Add')+' Personnel'} t={t}/><div style={{display:'flex',flexDirection:'column',gap:12}}><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Full Name</label><input value={oForm.name} onChange={e=>setOForm(f=>({...f,name:e.target.value}))} placeholder="Officer name" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Designation</label><input value={oForm.designation} onChange={e=>setOForm(f=>({...f,designation:e.target.value}))} placeholder="e.g. IFS (2015)" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Contact</label><input value={oForm.contact} onChange={e=>setOForm(f=>({...f,contact:e.target.value}))} placeholder="email@gov.in" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Vertical</label><select value={oForm.current_vertical} onChange={e=>setOForm(f=>({...f,current_vertical:e.target.value}))} style={inp}><option value="">Select vertical...</option>{vArr.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Origin Mission / Station</label><input value={oForm.origin_station||''} onChange={e=>setOForm(f=>({...f,origin_station:e.target.value}))} placeholder="e.g. MEA HQ, Geneva Mission" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Deployment Duration</label><select value={oForm.deployment_duration||''} onChange={e=>setOForm(f=>({...f,deployment_duration:e.target.value}))} style={inp}><option value="">Select duration...</option><option value="1 Week">1 Week</option><option value="2 Weeks">2 Weeks</option><option value="1 Month">1 Month</option><option value="3 Months">3 Months</option><option value="6 Months">6 Months</option><option value="Full Summit Duration">Full Summit Duration</option></select></div><div style={{display:'flex',gap:8,marginTop:8}}><button onClick={saveOfficer} style={{flex:1,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Save</button><button onClick={()=>setModal(null)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button></div></div></Modal>}
      
      {/* Resource Modal (NEW) */}
      {modal==='resourceForm'&&<Modal t={t} onClose={()=>setModal(null)}><ModalHeader icon="📦" title={(modalData.id?'Edit':'Add')+' Equipment'} t={t}/><div style={{display:'flex',flexDirection:'column',gap:12}}><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Item Name</label><input value={rForm.name} onChange={e=>setRForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Laptops, Vehicles, Chairs" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Quantity</label><input type="number" min="0" value={rForm.quantity} onChange={e=>setRForm(f=>({...f,quantity:parseInt(e.target.value, 10)||0}))} style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Assign to Division</label><select value={rForm.current_vertical} onChange={e=>setRForm(f=>({...f,current_vertical:e.target.value}))} style={inp}><option value="">Select vertical...</option>{vArr.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div><div style={{display:'flex',gap:8,marginTop:8}}><button onClick={saveResource} style={{flex:1,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Save</button><button onClick={()=>setModal(null)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button></div></div></Modal>}

      {modal==='taskForm'&&<Modal t={t} onClose={()=>setModal(null)}><ModalHeader icon="✅" title={(modalData.id?'Edit':'Add')+' Task'} t={t}/><div style={{display:'flex',flexDirection:'column',gap:12}}><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Title</label><input value={tForm.title} onChange={e=>setTForm(f=>({...f,title:e.target.value}))} placeholder="Task title" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Description</label><textarea value={tForm.description} onChange={e=>setTForm(f=>({...f,description:e.target.value}))} placeholder="Description" style={{...inp,height:65,resize:'vertical'}}/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Goal</label><input value={tForm.goal} onChange={e=>setTForm(f=>({...f,goal:e.target.value}))} placeholder="e.g. Protocol Readiness" style={inp}/></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Order</label><input type="number" value={tForm.task_order} onChange={e=>setTForm(f=>({...f,task_order:parseInt(e.target.value)||1}))} style={inp}/></div></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Vertical</label><select value={tForm.vertical_id} onChange={e=>setTForm(f=>({...f,vertical_id:e.target.value}))} style={inp}><option value="">Select vertical...</option>{vArr.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Assigned Officer</label><select value={tForm.assigned_officer} onChange={e=>setTForm(f=>({...f,assigned_officer:e.target.value}))} style={inp}><option value="">Unassigned</option>{oArr.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div><div><label style={{fontSize:11,color:t.muted,display:'block',marginBottom:4}}>Status</label><select value={tForm.status} onChange={e=>setTForm(f=>({...f,status:e.target.value}))} style={inp}>{['pending','in-progress','done'].map(s=><option key={s} value={s}>{s}</option>)}</select></div><div style={{display:'flex',gap:8,marginTop:8}}><button onClick={saveTask} style={{flex:1,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Save</button><button onClick={()=>setModal(null)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button></div></div></Modal>}
      {modal==='deleteConfirm'&&<Modal t={t} onClose={()=>setModal(null)} danger><ModalHeader icon="⚠️" title="Confirm Deletion" subtitle="This action cannot be undone." danger t={t}/><p style={{textAlign:'center',fontSize:14,color:t.muted,marginBottom:'1.5rem',lineHeight:1.6}}>Are you sure you want to permanently delete this record?</p><div style={{display:'flex',gap:10}}><button onClick={()=>setModal(null)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button><button onClick={handleDeleteConfirm} style={{flex:1,background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Delete</button></div></Modal>}
      {modal==='deleteOrder'&&<Modal t={t} onClose={()=>setModal(null)} danger><ModalHeader icon="📄" title="Delete Order" subtitle="This will permanently remove the file and its record." danger t={t}/><p style={{textAlign:'center',fontSize:14,color:t.muted,marginBottom:'1.5rem',lineHeight:1.6}}>Delete <strong style={{color:t.text}}>{modalData.order?.title}</strong>?</p><div style={{display:'flex',gap:10}}><button onClick={()=>setModal(null)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button><button onClick={()=>handleDeleteOrder(modalData.order)} style={{flex:1,background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Delete</button></div></Modal>}
      {modal==='clearTeamChat'&&<Modal t={t} onClose={()=>setModal(null)} danger><ModalHeader icon="🗑️" title="Clear Team Chat" subtitle="This will permanently delete all messages and attachments." danger t={t}/><div style={{display:'flex',gap:10}}><button onClick={()=>setModal(null)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button><button onClick={handleClearTeamChat} style={{flex:1,background:'#ef4444',color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Clear All</button></div></Modal>}
      {modal==='clearData'&&<Modal t={t} onClose={()=>setModal(null)} danger><ModalHeader icon="🗑️" title="Clear Dashboard Data" subtitle="Select what to delete. Verticals will be reseeded after clearing." danger t={t}/><div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:'1.5rem'}}>{[['verticals','🗂️ Verticals','Reseeds with default 4 verticals after clearing'],['officers','👥 Personnel','All personnel records will be removed'],['resources','📦 Resources','All equipment/resource items'],['tasks','✅ Task Chains','All tasks across all verticals'],['movements','🔄 Movement Log','Full audit trail will be wiped']].map(([key,label,desc])=><div key={key} onClick={()=>setClearOpts(o=>({...o,[key]:!o[key]}))} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',background:clearOpts[key]?'rgba(239,68,68,0.08)':t.surface,border:`1px solid ${clearOpts[key]?'#ef4444':t.border}`,borderRadius:10,cursor:'pointer',transition:'all 0.15s'}}><div style={{width:20,height:20,border:`2px solid ${clearOpts[key]?'#ef4444':t.border}`,borderRadius:4,background:clearOpts[key]?'#ef4444':'transparent',display:'grid',placeItems:'center',flexShrink:0,marginTop:1}}>{clearOpts[key]&&<span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span>}</div><div><div style={{fontSize:14,fontWeight:500,color:t.text}}>{label}</div><div style={{fontSize:12,color:t.muted,marginTop:2}}>{desc}</div></div></div>)}</div><div style={{display:'flex',gap:10}}><button onClick={()=>setModal(null)} style={{flex:1,background:'transparent',border:'1px solid '+t.border,borderRadius:8,padding:10,fontSize:14,cursor:'pointer',color:t.muted}}>Cancel</button><button onClick={handleClearData} disabled={!Object.values(clearOpts).some(Boolean)} style={{flex:1,background:Object.values(clearOpts).some(Boolean)?'#ef4444':'#334155',color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:Object.values(clearOpts).some(Boolean)?'pointer':'default',transition:'background 0.2s'}}>Confirm Clear</button></div></Modal>}
      {showInactivityWarning&&<Modal t={t} onClose={()=>setShowInactivityWarning(false)}><ModalHeader icon="⏱️" title="Session Expiring Soon" subtitle="You will be logged out in 2 minutes due to inactivity." t={t}/><div style={{display:'flex',gap:10}}><button onClick={()=>setShowInactivityWarning(false)} style={{flex:1,background:t.accent,color:'#fff',border:'none',borderRadius:8,padding:10,fontSize:14,fontWeight:500,cursor:'pointer'}}>Stay Logged In</button></div></Modal>}
      {modal==='alert'&&<Modal t={t} onClose={()=>setModal(null)} danger={modalData.danger}><ModalHeader icon={modalData.icon} title={modalData.title} danger={modalData.danger} t={t}/><p style={{textAlign:'center',fontSize:14,color:t.muted,marginBottom:'1.5rem',lineHeight:1.6}}>{modalData.text}</p><div style={{display:'flex',justifyContent:'center'}}><button onClick={()=>setModal(null)} style={{background:modalData.danger?'#ef4444':t.accent,color:'#fff',border:'none',borderRadius:8,padding:'10px 32px',fontSize:14,fontWeight:500,cursor:'pointer',boxShadow:t.shadow}}>OK</button></div></Modal>}

      {/* ── AI CHAT BUTTON ── */}
      <button onPointerDown={startDragChat} onClick={()=>{if(chatDragMoved.current)return;setChatOpen(o=>!o);}}
        style={{position:'fixed',bottom:30,right:30,zIndex:6000,width:64,height:64,borderRadius:'50%',background:t.accent,color:'#fff',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'grab',boxShadow:'0 8px 25px rgba(0,0,0,0.4)',transform:`translate(${chatPos.x}px,${chatPos.y}px)`,transition:isDraggingChat.current?'none':'transform 0.2s'}}>
        {chatOpen?<span style={{fontSize:24}}>✖</span>:<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a11.16 11.16 0 0 0-4.82 9.53c0 1.5.55 2.97 1.48 4.2V20l3.34-2.23L15.34 20v-4.27c.93-1.23 1.48-2.7 1.48-4.2A11.16 11.16 0 0 0 12 2zm-5 10c-1.5 0-3 1-4 3 2.5 0 3.5-1.5 4-3zm10 0c1 1.5 2 3 4 3-1-2-2.5-3-4-3z"/></svg>}
      </button>

      {/* ── AI CHAT PANEL ── */}
      <div className={`chat-panel ${chatOpen?'open':''}`}>
        <div style={{background:t.surface,padding:'12px 16px',borderBottom:'1px solid '+t.border,display:'flex',flexDirection:'column',gap:10,flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{color:t.accent,display:'flex'}}><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a11.16 11.16 0 0 0-4.82 9.53c0 1.5.55 2.97 1.48 4.2V20l3.34-2.23L15.34 20v-4.27c.93-1.23 1.48-2.7 1.48-4.2A11.16 11.16 0 0 0 12 2zm-5 10c-1.5 0-3 1-4 3 2.5 0 3.5-1.5 4-3zm10 0c1 1.5 2 3 4 3-1-2-2.5-3-4-3z"/></svg></div><h3 style={{margin:0,fontSize:15,fontWeight:600,color:t.text}}>EMS AI Agent</h3></div>
            <div style={{display:'flex',gap:8}}><button onClick={()=>{setAiRulesPwInput('');setAiRulesPwErr(false);setShowAiRulesAuthModal(true);}} style={{background:'transparent',border:'none',color:t.muted,cursor:'pointer',fontSize:11}}>⚙️ Rules</button><button onClick={()=>setChatHistory([])} style={{background:'transparent',border:'none',color:t.muted,cursor:'pointer',fontSize:11}}>🗑 Clear</button></div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>{adminMode?<span style={{background:'rgba(239,68,68,0.1)',border:'1px solid #ef4444',color:'#ef4444',fontSize:10,fontWeight:700,padding:'6px 10px',borderRadius:8,flex:1,textAlign:'center',textTransform:'uppercase'}}>⚡ AGENTIC</span>:<span style={{background:'transparent',border:'1px solid '+t.border,color:t.muted,fontSize:10,fontWeight:700,padding:'6px 10px',borderRadius:8,flex:1,textAlign:'center',textTransform:'uppercase'}}>Read-Only</span>}</div>
        </div>
        <div style={{flex:1,padding:16,overflowY:'auto',display:'flex',flexDirection:'column',gap:16}}>
          {chatHistory.length===0?<div style={{textAlign:'center',padding:'40px 20px',color:t.muted}}><div style={{marginBottom:16,display:'grid',placeItems:'center',color:t.accent}}><svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a11.16 11.16 0 0 0-4.82 9.53c0 1.5.55 2.97 1.48 4.2V20l3.34-2.23L15.34 20v-4.27c.93-1.23 1.48-2.7 1.48-4.2A11.16 11.16 0 0 0 12 2zm-5 10c-1.5 0-3 1-4 3 2.5 0 3.5-1.5 4-3zm10 0c1 1.5 2 3 4 3-1-2-2.5-3-4-3z"/></svg></div><div style={{fontSize:15,color:t.text,marginBottom:8}}>EMS AI Agent</div><div style={{fontSize:13,marginBottom:20}}>Ask about deployments, tasks or movements.{adminMode?' I can also make changes.':''}</div><div style={{display:'flex',flexWrap:'wrap',gap:8,justifyContent:'center'}}>{['Who is in Protocol?','Pending tasks?','Progress summary','Officers in EG & IT'].map(q=><button key={q} onClick={()=>sendChat(q)} style={{background:t.bg,border:'1px solid '+t.border,color:t.muted,padding:'6px 12px',borderRadius:8,fontSize:12,cursor:'pointer'}}>{q}</button>)}</div></div>:chatHistory.map((m,i)=>(
            <div key={i} style={{alignSelf:m.role==='user'?'flex-end':'flex-start',maxWidth:'85%'}}>
              <div style={{fontSize:10,color:t.muted,marginBottom:4,textAlign:m.role==='user'?'right':'left'}}>{m.role==='user'?'You':'EMS AI Agent'}</div>
              <div style={{padding:'12px 14px',borderRadius:m.role==='user'?'18px 18px 2px 18px':'18px 18px 18px 2px',background:m.role==='user'?t.accent:t.surface,border:m.role==='user'?'none':'1px solid '+t.border,color:m.role==='user'?'#fff':t.text,fontSize:13.5,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{m.content}</div>
            </div>
          ))}
          {chatLoading&&<div style={{alignSelf:'flex-start',color:t.muted,fontSize:12,fontStyle:'italic',marginLeft:4}}>Analysing data...</div>}
          <div ref={chatEndRef}/>
        </div>
        <div style={{padding:'12px 16px',background:t.surface,borderTop:'1px solid '+t.border,display:'flex',gap:10,alignItems:'center',flexShrink:0}}>
          <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}}} placeholder={adminMode?'Ask or instruct...':'Ask about your event...'} style={{flex:1,padding:'12px 16px',borderRadius:22,border:'1px solid '+t.border,background:t.inputBg,color:t.text,fontSize:13,outline:'none',resize:'none',maxHeight:100,minHeight:44,fontFamily:'inherit'}}/>
          <button onClick={()=>sendChat()} disabled={chatLoading||!chatInput.trim()} style={{background:chatInput.trim()?t.accent:'transparent',border:chatInput.trim()?'none':'1px solid '+t.border,color:chatInput.trim()?'#fff':t.muted,borderRadius:'50%',width:44,height:44,display:'flex',alignItems:'center',justifyContent:'center',cursor:chatInput.trim()?'pointer':'default',transition:'all 0.2s',flexShrink:0}}>➤</button>
        </div>
      </div>

      {/* ── PDF VIEWER ── */}
      {viewPdf&&(
        <div style={{position:'fixed',inset:0,zIndex:9999,background:t.bg,display:'flex',flexDirection:'column',animation:'fadeIn 0.2s ease'}}>
          <div style={{padding:'12px 24px',background:t.surface,borderBottom:'1px solid '+t.border,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:36,height:36,borderRadius:8,background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',display:'grid',placeItems:'center',fontSize:18}}>📕</div><div><div style={{fontSize:16,fontWeight:600,color:t.text}}>{viewPdf.title}</div><div style={{fontSize:12,color:t.muted}}>{viewPdf.division}</div></div></div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <a href={viewPdf.file_url} download={viewPdf.file_name} target="_blank" rel="noreferrer" style={{background:t.accent,color:'#fff',padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:6}}>⬇ Download PDF</a>
              <button onClick={()=>setViewPdf(null)} style={{background:'transparent',color:t.text,border:'1px solid '+t.border,padding:'8px 16px',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer'}}>✖ Close Viewer</button>
            </div>
          </div>
          <object data={`${viewPdf.file_url}#view=FitH`} type="application/pdf" style={{flex:1,width:'100%',height:'100%',border:'none',background:'#525659'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:t.muted,gap:12}}><p>Your browser does not support inline PDF viewing.</p><a href={viewPdf.file_url} download={viewPdf.file_name} style={{color:t.accent,textDecoration:'underline'}}>Click here to download the PDF instead.</a></div>
          </object>
        </div>
      )}
    </div>
  );
}
