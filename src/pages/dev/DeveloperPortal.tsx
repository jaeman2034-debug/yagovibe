import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DeveloperPortal(){
  const [plugins,setPlugins] = useState<any[]>([]);
  const [loading,setLoading] = useState(false);
  const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 'https://asia-northeast3-yago-vibe-spt.cloudfunctions.net';

  useEffect(()=>{
    loadPlugins();
  },[]);

  async function loadPlugins(){
    try{
      setLoading(true);
      const r = await fetch(`${functionsOrigin}/devListPlugins`);
      const d = await r.json();
      setPlugins(d.items||[]);
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className='p-4 space-y-4'>
      <h1 className='text-2xl font-bold'>🧠 YAGO Developer Portal</h1>
      <Card><CardContent className='p-4 space-y-2'>
        <div className='flex items-center gap-2'>
          <Button size='sm' onClick={()=> location.href=`${functionsOrigin}/devRegisterPlugin`}>새 플러그인 등록</Button>
          <Button size='sm' variant='outline' onClick={loadPlugins} disabled={loading}>새로고침</Button>
        </div>
        <div className='grid md:grid-cols-2 gap-3'>
          {plugins.map((p:any)=>(
            <div key={p.id} className='border rounded p-3'>
              <div className='font-semibold'>{p.name||p.id}</div>
              <div className='text-xs text-muted-foreground'>{p.description||'-'}</div>
              <div className='text-xs'>상태: {p.status||'draft'}</div>
              <div className='text-xs'>카테고리: {p.category||'general'}</div>
              <div className='text-xs'>버전: {p.version||'-'}</div>
            </div>
          ))}
        </div>
      </CardContent></Card>
    </div>
  );
}
