import * as React from 'react'
import { Button } from '@/components/ui/button'
import type { HangzhouSchoolInput, HangzhouSchoolRecord, HangzhouCallReviewInput, HangzhouCallReviewRecord, HangzhouContractCheckRecord, HangzhouCompetitorInput, HangzhouCompetitorRecord } from '../../../types/settings'

function Input(props: React.InputHTMLAttributes<HTMLInputElement>): React.ReactElement { return <input {...props} className="h-9 rounded-md border bg-background px-3 text-sm" /> }
function Area(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>): React.ReactElement { return <textarea {...props} className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" /> }

export function HangzhouSchoolPanel(): React.ReactElement {
  const empty: HangzhouSchoolInput = { name:'', province:'', city:'', department:'', contactName:'', contactRole:'', phone:'', wechat:'', status:'uncontacted', notes:'' }
  const [form,setForm]=React.useState(empty); const [items,setItems]=React.useState<HangzhouSchoolRecord[]>([])
  const refresh=React.useCallback(async()=>setItems(await window.electronAPI.listHangzhouSchools()),[])
  React.useEffect(()=>{void refresh()},[refresh])
  const add=async()=>{if(!form.name.trim())return;await window.electronAPI.createHangzhouSchool({...form,name:form.name.trim()});setForm(empty);await refresh()}
  return <section className="rounded-xl border border-border/70 bg-card/70">
    <div className="border-b px-5 py-4"><h2 className="font-semibold">学校渠道库</h2><p className="mt-1 text-xs text-muted-foreground">学校、学院、联系人、手机号/微信与合作阶段。</p></div>
    <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
      <Input placeholder="学校名称 *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/><Input placeholder="省份" value={form.province} onChange={e=>setForm(p=>({...p,province:e.target.value}))}/><Input placeholder="城市" value={form.city} onChange={e=>setForm(p=>({...p,city:e.target.value}))}/><Input placeholder="学院/部门" value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}/>
      <Input placeholder="联系人" value={form.contactName} onChange={e=>setForm(p=>({...p,contactName:e.target.value}))}/><Input placeholder="身份/岗位" value={form.contactRole} onChange={e=>setForm(p=>({...p,contactRole:e.target.value}))}/><Input placeholder="手机号" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}/><Input placeholder="微信" value={form.wechat} onChange={e=>setForm(p=>({...p,wechat:e.target.value}))}/>
      <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as HangzhouSchoolInput['status']}))}><option value="uncontacted">未联系</option><option value="contacted">已联系</option><option value="interested">有兴趣</option><option value="activity">待活动</option><option value="cooperating">已合作</option></select>
      <Input placeholder="备注" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/><Button disabled={!form.name.trim()} onClick={()=>void add()}>新增学校</Button>
    </div>
    <div className="max-h-64 overflow-auto border-t">{items.length===0?<div className="p-6 text-center text-sm text-muted-foreground">暂无学校渠道</div>:items.map(x=><div key={x.id} className="flex items-center gap-4 border-b px-4 py-3 text-sm"><div className="min-w-0 flex-1"><div className="font-medium">{x.name}</div><div className="text-xs text-muted-foreground">{[x.province,x.city,x.department,x.contactName,x.phone].filter(Boolean).join(' · ')}</div></div><div className="text-xs">{x.status}</div><Button size="sm" variant="ghost" onClick={()=>{if(window.confirm('删除这所学校？'))void window.electronAPI.deleteHangzhouSchool(x.id).then(refresh)}}>删除</Button></div>)}</div>
  </section>
}

export function HangzhouCallReviewPanel(): React.ReactElement {
  const empty: HangzhouCallReviewInput = { title:'', studentId:'', transcript:'', summary:'', objections:[], strengths:[], misses:[], nextAction:'' }
  const [form,setForm]=React.useState(empty); const [items,setItems]=React.useState<HangzhouCallReviewRecord[]>([])
  const refresh=React.useCallback(async()=>setItems(await window.electronAPI.listHangzhouCallReviews()),[])
  React.useEffect(()=>{void refresh()},[refresh])
  const add=async()=>{if(!form.title.trim())return;await window.electronAPI.createHangzhouCallReview({...form,title:form.title.trim()});setForm(empty);await refresh()}
  return <section className="rounded-xl border border-border/70 bg-card/70">
    <div className="border-b px-5 py-4"><h2 className="font-semibold">通话复盘</h2><p className="mt-1 text-xs text-muted-foreground">V1 先沉淀转写、总结、异议和下一步；后续接 Agent 自动分析。</p></div>
    <div className="grid gap-2 p-4 lg:grid-cols-2">
      <Input placeholder="复盘标题 *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/><Input placeholder="学生ID/关联标识" value={form.studentId} onChange={e=>setForm(p=>({...p,studentId:e.target.value}))}/>
      <Area placeholder="通话转写" value={form.transcript} onChange={e=>setForm(p=>({...p,transcript:e.target.value}))}/><Area placeholder="总结" value={form.summary} onChange={e=>setForm(p=>({...p,summary:e.target.value}))}/>
      <Input placeholder="异议（用逗号分隔）" onChange={e=>setForm(p=>({...p,objections:e.target.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean)}))}/><Input placeholder="漏问/遗漏（用逗号分隔）" onChange={e=>setForm(p=>({...p,misses:e.target.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean)}))}/>
      <Input placeholder="下一步行动" value={form.nextAction} onChange={e=>setForm(p=>({...p,nextAction:e.target.value}))}/><Button disabled={!form.title.trim()} onClick={()=>void add()}>保存复盘</Button>
    </div>
    <div className="max-h-64 overflow-auto border-t">{items.length===0?<div className="p-6 text-center text-sm text-muted-foreground">暂无通话复盘</div>:items.map(x=><div key={x.id} className="flex gap-4 border-b px-4 py-3 text-sm"><div className="min-w-0 flex-1"><div className="font-medium">{x.title}</div><div className="mt-1 truncate text-xs text-muted-foreground">{x.summary||x.nextAction||'—'}</div></div><Button size="sm" variant="ghost" onClick={()=>void window.electronAPI.deleteHangzhouCallReview(x.id).then(refresh)}>删除</Button></div>)}</div>
  </section>
}

export function HangzhouContractPanel(): React.ReactElement {
  const [title,setTitle]=React.useState(''); const [sourceName,setSourceName]=React.useState(''); const [sourceVersion,setSourceVersion]=React.useState(''); const [claimsText,setClaimsText]=React.useState(''); const [sourceText,setSourceText]=React.useState('')
  const [items,setItems]=React.useState<HangzhouContractCheckRecord[]>([])
  const refresh=React.useCallback(async()=>setItems(await window.electronAPI.listHangzhouContractChecks()),[])
  React.useEffect(()=>{void refresh()},[refresh])
  const run=async()=>{
    const claims=claimsText.split(/[\n,，]/).map(s=>s.trim()).filter(Boolean); if(!title.trim()||claims.length===0)return
    const normalized=sourceText.replace(/\s+/g,'').toLowerCase(); const matched=claims.filter(c=>normalized.includes(c.replace(/\s+/g,'').toLowerCase())); const warning=claims.filter(c=>!matched.includes(c))
    await window.electronAPI.createHangzhouContractCheck({title:title.trim(),sourceName,sourceVersion,sourceUpdatedAt:Date.now(),claims,matchedClaims:matched,warningClaims:warning,notes:'V1 为文本命中检查；未命中不等于合同一定没有法律含义相近条款。'})
    setTitle('');setClaimsText('');setSourceText('');await refresh()
  }
  return <section className="rounded-xl border border-border/70 bg-card/70">
    <div className="border-b px-5 py-4"><h2 className="font-semibold">合同 / 承诺检查</h2><p className="mt-1 text-xs text-muted-foreground">把招生承诺与当前合同文本对照；V1 做明确文本命中，避免把推断当合同事实。</p></div>
    <div className="grid gap-2 p-4 lg:grid-cols-2"><Input placeholder="检查标题 *" value={title} onChange={e=>setTitle(e.target.value)}/><Input placeholder="合同文件名/名称" value={sourceName} onChange={e=>setSourceName(e.target.value)}/><Input placeholder="合同版本" value={sourceVersion} onChange={e=>setSourceVersion(e.target.value)}/><Input placeholder="承诺项，逗号或换行分隔" value={claimsText} onChange={e=>setClaimsText(e.target.value)}/><Area placeholder="粘贴合同原文" value={sourceText} onChange={e=>setSourceText(e.target.value)}/><Button disabled={!title.trim()||!claimsText.trim()||!sourceText.trim()} onClick={()=>void run()}>执行检查</Button></div>
    <div className="max-h-64 overflow-auto border-t">{items.length===0?<div className="p-6 text-center text-sm text-muted-foreground">暂无合同检查记录</div>:items.map(x=><div key={x.id} className="border-b px-4 py-3 text-sm"><div className="font-medium">{x.title}</div><div className="mt-1 text-xs text-muted-foreground">命中 {x.matchedClaims.length} · 警告 {x.warningClaims.length} · {x.sourceName||'未命名合同'} {x.sourceVersion||''}</div></div>)}</div>
  </section>
}

export function HangzhouCompetitorPanel(): React.ReactElement {
  const empty: HangzhouCompetitorInput={name:'',platform:'',account:'',company:'',lastObservedAt:Date.now(),lastTopic:'',lastMetric:0,notes:''}
  const [form,setForm]=React.useState(empty);const [items,setItems]=React.useState<HangzhouCompetitorRecord[]>([])
  const refresh=React.useCallback(async()=>setItems(await window.electronAPI.listHangzhouCompetitors()),[])
  React.useEffect(()=>{void refresh()},[refresh])
  const add=async()=>{if(!form.name.trim())return;await window.electronAPI.createHangzhouCompetitor({...form,name:form.name.trim(),lastObservedAt:Date.now()});setForm(empty);await refresh()}
  return <section className="rounded-xl border border-border/70 bg-card/70">
    <div className="border-b px-5 py-4"><h2 className="font-semibold">同行监控</h2><p className="mt-1 text-xs text-muted-foreground">先建立监控清单和最后观测值；自动抓取必须接明确平台/API/浏览器任务。</p></div>
    <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4"><Input placeholder="同行/账号名称 *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}/><Input placeholder="平台" value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))}/><Input placeholder="账号" value={form.account} onChange={e=>setForm(p=>({...p,account:e.target.value}))}/><Input placeholder="公司" value={form.company} onChange={e=>setForm(p=>({...p,company:e.target.value}))}/><Input placeholder="最近主题" value={form.lastTopic} onChange={e=>setForm(p=>({...p,lastTopic:e.target.value}))}/><Input type="number" placeholder="最近指标/播放" value={form.lastMetric} onChange={e=>setForm(p=>({...p,lastMetric:Number(e.target.value)}))}/><Input placeholder="备注" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/><Button disabled={!form.name.trim()} onClick={()=>void add()}>加入监控</Button></div>
    <div className="max-h-64 overflow-auto border-t">{items.length===0?<div className="p-6 text-center text-sm text-muted-foreground">暂无同行监控对象</div>:items.map(x=><div key={x.id} className="flex gap-4 border-b px-4 py-3 text-sm"><div className="min-w-0 flex-1"><div className="font-medium">{x.name}</div><div className="text-xs text-muted-foreground">{[x.platform,x.account,x.lastTopic,String(x.lastMetric??0)].filter(Boolean).join(' · ')}</div></div><Button size="sm" variant="ghost" onClick={()=>void window.electronAPI.deleteHangzhouCompetitor(x.id).then(refresh)}>删除</Button></div>)}</div>
  </section>
}