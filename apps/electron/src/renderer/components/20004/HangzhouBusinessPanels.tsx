import * as React from 'react'
import { Button } from '@/components/ui/button'
import type { HangzhouChannelInput, HangzhouChannelRecord, HangzhouContentInput, HangzhouContentRecord, HangzhouIntelligenceInput, HangzhouIntelligenceRecord } from '../../../types/settings'

function Field(props: React.InputHTMLAttributes<HTMLInputElement>): React.ReactElement {
  return <input {...props} className="h-9 rounded-md border bg-background px-3 text-sm" />
}

export function HangzhouChannelPanel({ onChanged }: { onChanged?: () => void }): React.ReactElement {
  const empty: HangzhouChannelInput = { name: '', company: '', city: '', phone: '', parent: '', registrations: 0, arrivals: 0, signed: 0, notes: '' }
  const [form, setForm] = React.useState(empty)
  const [items, setItems] = React.useState<HangzhouChannelRecord[]>([])
  const refresh = React.useCallback(async () => setItems(await window.electronAPI.listHangzhouChannels()), [])
  React.useEffect(() => { void refresh() }, [refresh])
  const add = async (): Promise<void> => {
    if (!form.name.trim()) return
    await window.electronAPI.createHangzhouChannel({ ...form, name: form.name.trim() })
    setForm(empty); await refresh(); onChanged?.()
  }
  return <section className="rounded-xl border border-border/70 bg-card/70">
    <div className="border-b px-5 py-4"><h2 className="font-semibold">渠道关系</h2><p className="mt-1 text-xs text-muted-foreground">代理、介绍人、团队/公司及报名到校签约数据。</p></div>
    <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
      <Field placeholder="渠道/人员名称 *" value={form.name} onChange={(e)=>setForm(p=>({...p,name:e.target.value}))}/>
      <Field placeholder="公司/团队" value={form.company} onChange={(e)=>setForm(p=>({...p,company:e.target.value}))}/>
      <Field placeholder="城市" value={form.city} onChange={(e)=>setForm(p=>({...p,city:e.target.value}))}/>
      <Field placeholder="手机号" value={form.phone} onChange={(e)=>setForm(p=>({...p,phone:e.target.value}))}/>
      <Field placeholder="上级/介绍人" value={form.parent} onChange={(e)=>setForm(p=>({...p,parent:e.target.value}))}/>
      <Field type="number" placeholder="报名" value={form.registrations} onChange={(e)=>setForm(p=>({...p,registrations:Number(e.target.value)}))}/>
      <Field type="number" placeholder="到校" value={form.arrivals} onChange={(e)=>setForm(p=>({...p,arrivals:Number(e.target.value)}))}/>
      <Field type="number" placeholder="签约" value={form.signed} onChange={(e)=>setForm(p=>({...p,signed:Number(e.target.value)}))}/>
      <Field placeholder="备注" value={form.notes} onChange={(e)=>setForm(p=>({...p,notes:e.target.value}))}/>
      <Button disabled={!form.name.trim()} onClick={()=>void add()}>新增渠道</Button>
    </div>
    <div className="max-h-72 overflow-auto border-t">
      {items.length===0 ? <div className="p-6 text-center text-sm text-muted-foreground">暂无渠道档案</div> :
        <table className="w-full min-w-[760px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">名称</th><th>公司/城市</th><th>上级</th><th>报名</th><th>到校</th><th>签约</th><th>转化</th><th></th></tr></thead><tbody>
          {items.map(x=><tr key={x.id} className="border-t"><td className="p-3 font-medium">{x.name}<div className="text-xs text-muted-foreground">{x.phone||''}</div></td><td>{[x.company,x.city].filter(Boolean).join(' · ')||'—'}</td><td>{x.parent||'—'}</td><td>{x.registrations}</td><td>{x.arrivals}</td><td>{x.signed}</td><td>{x.registrations>0 ? (x.signed/x.registrations*100).toFixed(1)+'%' : '—'}</td><td><Button size="sm" variant="ghost" onClick={()=>{if(window.confirm('删除渠道「'+x.name+'」？')) void window.electronAPI.deleteHangzhouChannel(x.id).then(async()=>{await refresh();onChanged?.()})}}>删除</Button></td></tr>)}
        </tbody></table>}
    </div>
  </section>
}

export function HangzhouContentPanel({ onChanged }: { onChanged?: () => void }): React.ReactElement {
  const empty: HangzhouContentInput = { title:'', platform:'视频号', status:'idea', hook:'', views:0, leads:0, notes:'' }
  const [form,setForm]=React.useState(empty); const [items,setItems]=React.useState<HangzhouContentRecord[]>([])
  const refresh=React.useCallback(async()=>setItems(await window.electronAPI.listHangzhouContent()),[])
  React.useEffect(()=>{void refresh()},[refresh])
  const add=async()=>{if(!form.title.trim())return;await window.electronAPI.createHangzhouContent({...form,title:form.title.trim()});setForm(empty);await refresh();onChanged?.()}
  return <section className="rounded-xl border border-border/70 bg-card/70">
    <div className="border-b px-5 py-4"><h2 className="font-semibold">内容作战室</h2><p className="mt-1 text-xs text-muted-foreground">选题、标题、平台、状态、播放与询盘复盘。</p></div>
    <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
      <Field placeholder="标题/选题 *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/>
      <Field placeholder="平台" value={form.platform} onChange={e=>setForm(p=>({...p,platform:e.target.value}))}/>
      <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value as HangzhouContentInput['status']}))}><option value="idea">选题</option><option value="script">脚本</option><option value="shot">已拍</option><option value="published">已发布</option></select>
      <Field placeholder="核心钩子/金句" value={form.hook} onChange={e=>setForm(p=>({...p,hook:e.target.value}))}/>
      <Field type="number" placeholder="播放" value={form.views} onChange={e=>setForm(p=>({...p,views:Number(e.target.value)}))}/>
      <Field type="number" placeholder="询盘" value={form.leads} onChange={e=>setForm(p=>({...p,leads:Number(e.target.value)}))}/>
      <Field placeholder="备注" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
      <Button disabled={!form.title.trim()} onClick={()=>void add()}>新增内容</Button>
    </div>
    <div className="max-h-72 overflow-auto border-t">{items.length===0?<div className="p-6 text-center text-sm text-muted-foreground">暂无内容资产</div>:items.map(x=><div key={x.id} className="flex items-center gap-4 border-b px-4 py-3 text-sm"><div className="min-w-0 flex-1"><div className="truncate font-medium">{x.title}</div><div className="text-xs text-muted-foreground">{x.platform||'—'} · {x.status} · 播放 {x.views??0} · 询盘 {x.leads??0}</div></div><Button size="sm" variant="ghost" onClick={()=>{if(window.confirm('删除这条内容记录？'))void window.electronAPI.deleteHangzhouContent(x.id).then(async()=>{await refresh();onChanged?.()})}}>删除</Button></div>)}</div>
  </section>
}

export function HangzhouIntelligencePanel({ onChanged }: { onChanged?: () => void }): React.ReactElement {
  const empty: HangzhouIntelligenceInput={title:'',entityType:'人物',subject:'',sourceUrl:'',evidence:'',confidence:'C',notes:''}
  const [form,setForm]=React.useState(empty);const [items,setItems]=React.useState<HangzhouIntelligenceRecord[]>([])
  const refresh=React.useCallback(async()=>setItems(await window.electronAPI.listHangzhouIntelligence()),[])
  React.useEffect(()=>{void refresh()},[refresh])
  const add=async()=>{if(!form.title.trim())return;await window.electronAPI.createHangzhouIntelligence({...form,title:form.title.trim()});setForm(empty);await refresh();onChanged?.()}
  return <section className="rounded-xl border border-border/70 bg-card/70">
    <div className="border-b px-5 py-4"><h2 className="font-semibold">情报中心</h2><p className="mt-1 text-xs text-muted-foreground">人物、公司、账号、证据来源与可信度分级。</p></div>
    <div className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-4">
      <Field placeholder="情报标题 *" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/>
      <Field placeholder="类型：人物/公司/账号…" value={form.entityType} onChange={e=>setForm(p=>({...p,entityType:e.target.value}))}/>
      <Field placeholder="主体" value={form.subject} onChange={e=>setForm(p=>({...p,subject:e.target.value}))}/>
      <Field placeholder="来源 URL" value={form.sourceUrl} onChange={e=>setForm(p=>({...p,sourceUrl:e.target.value}))}/>
      <Field placeholder="证据要点" value={form.evidence} onChange={e=>setForm(p=>({...p,evidence:e.target.value}))}/>
      <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.confidence} onChange={e=>setForm(p=>({...p,confidence:e.target.value as HangzhouIntelligenceInput['confidence']}))}><option value="A">A 官方/一手</option><option value="B">B 多来源印证</option><option value="C">C 单一来源</option><option value="D">D 待验证推测</option></select>
      <Field placeholder="备注" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
      <Button disabled={!form.title.trim()} onClick={()=>void add()}>新增情报</Button>
    </div>
    <div className="max-h-72 overflow-auto border-t">{items.length===0?<div className="p-6 text-center text-sm text-muted-foreground">暂无情报记录</div>:items.map(x=><div key={x.id} className="flex gap-4 border-b px-4 py-3 text-sm"><div className="min-w-0 flex-1"><div className="font-medium">{x.title} <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">{x.confidence}</span></div><div className="mt-1 truncate text-xs text-muted-foreground">{[x.entityType,x.subject,x.evidence].filter(Boolean).join(' · ')}</div></div><Button size="sm" variant="ghost" onClick={()=>{if(window.confirm('删除这条情报？'))void window.electronAPI.deleteHangzhouIntelligence(x.id).then(async()=>{await refresh();onChanged?.()})}}>删除</Button></div>)}</div>
  </section>
}