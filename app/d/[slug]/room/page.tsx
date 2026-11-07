'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import type { DropWithDesigner, RoomPost } from '@/lib/types';
import { timeAgo } from '@/lib/utils';
import { Navbar } from '@/components/navbar';
import { ArrowLeft, MessageCircle, Loader2, Send, Zap, Rocket, Star, HelpCircle, Users, ShoppingBag } from 'lucide-react';

const postTypes = [
  { key: 'all', label: 'All', icon: MessageCircle },
  { key: 'launch', label: 'Launch', icon: Rocket },
  { key: 'review', label: 'Review', icon: Star },
  { key: 'question', label: 'Question', icon: HelpCircle },
  { key: 'collab', label: 'Collab', icon: Users },
] as const;

const typeColors: Record<string, string> = { launch: 'bg-lime text-ink', review: 'bg-blue-500 text-ink', question: 'bg-orange-500 text-ink', collab: 'bg-purple-500 text-ink' };

export default function RoomPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const [drop, setDrop] = useState<DropWithDesigner | null>(null);
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<string>('question');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) { setLoading(false); return; }
    (async () => {
      const { data: dropData } = await supabase.from('drops').select('id, designer_id, slug, title, description, price, max_qty, current_qty, status, countdown_end, images, sizes, created_at').eq('slug', slug).maybeSingle();
      if (dropData) {
        const { data: profile } = await supabase.from('designers_public').select('id, brand_name, verified, created_at').eq('id', dropData.designer_id).maybeSingle();
        const d = {
          ...(dropData as unknown as DropWithDesigner),
          designer: profile
            ? { id: profile.id, brand_name: profile.brand_name, email: '', phone: null, bank_name: null, account_number: null, paystack_subaccount_code: null, verified: profile.verified, created_at: profile.created_at }
            : undefined,
        } as DropWithDesigner;
        setDrop(d);
        const { data: postData } = await supabase.from('room_posts').select('*').eq('drop_id', d.id).order('created_at', { ascending: false });
        setPosts((postData || []) as RoomPost[]);
      }
      setLoading(false);
    })();
  }, [slug]);

  const handlePost = async () => {
    if (!content.trim() || !drop || !user) return;
    setPosting(true);
    try {
      const { data, error } = await supabase.from('room_posts').insert({ drop_id: drop.id, user_id: user.id, type: postType, content: content.trim() }).select().single();
      if (error) throw error;
      if (data) { setPosts([data as RoomPost, ...posts]); setContent(''); }
    } catch { /* RLS will reject if not authenticated */ } finally { setPosting(false); }
  };

  const filteredPosts = activeTab === 'all' ? posts : posts.filter((p) => p.type === activeTab);

  if (!isSupabaseConfigured) return (<div className="min-h-screen bg-ivory"><Navbar /><main className="mx-auto max-w-3xl px-4 py-24"><h1 className="font-display text-4xl font-black tracking-tighter text-ink">Room unavailable</h1><p className="mt-3 text-sm leading-6 text-ink/70">This preview has no project connection, so this room cannot be loaded.</p></main></div>);
  if (loading) return (<div className="min-h-screen bg-ivory flex items-center justify-center"><Loader2 className="h-8 w-8 text-ink animate-spin" /></div>);
  if (!drop) return (<div className="min-h-screen bg-ivory flex items-center justify-center px-4"><div className="text-center"><h1 className="font-display text-3xl font-black text-ink">ROOM NOT FOUND</h1><Link href="/" className="mt-4 inline-flex items-center gap-2 text-ink font-semibold"><ArrowLeft className="h-4 w-4" /> Back to feed</Link></div></div>);

  return (
    <div className="min-h-screen bg-ivory pb-20">
      <Navbar />
      <div className="sticky top-16 z-40 border-b border-ink/10 bg-ivory/95 backdrop-blur-xl"><div className="mx-auto max-w-3xl px-4 py-3"><div className="flex items-center justify-between gap-3"><Link href={`/d/${slug}`} className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink transition-colors"><ArrowLeft className="h-4 w-4" /><span className="truncate">{drop.title}</span></Link><Link href={`/d/${slug}`} className="flex items-center gap-2 rounded-full bg-lime px-4 py-2 text-sm font-bold text-ink transition-all hover:scale-105 whitespace-nowrap"><ShoppingBag className="h-4 w-4" />VIEW DROP</Link></div></div></div>
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6"><div className="flex items-center gap-2 mb-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime text-ink"><Zap className="h-5 w-5" fill="black" /></span><h1 className="font-display text-2xl font-black tracking-tighter text-ink">{drop.title} ROOM</h1></div><p className="text-sm text-ink/60">by {drop.designer?.brand_name} · {posts.length} {posts.length === 1 ? 'message' : 'messages'}</p></div>
        {user ? (
          <div className="rounded-3xl border border-ink/10 bg-white p-4 mb-6"><textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Share something about this drop..." rows={3} className="w-full bg-transparent text-ink placeholder:text-ink/40 outline-none resize-none text-sm" /><div className="flex items-center justify-between mt-3 pt-3 border-t border-ink/10"><select value={postType} onChange={(e) => setPostType(e.target.value)} className="rounded-lg border border-ink/15 bg-ivory px-3 py-2 text-sm text-ink outline-none focus:border-lime/40"><option value="question">Question</option><option value="review">Review</option><option value="launch">Launch</option><option value="collab">Collab</option></select><button onClick={handlePost} disabled={!content.trim() || posting} className="flex items-center gap-2 rounded-full bg-lime px-5 py-2 text-sm font-bold text-ink transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100">{posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Post</button></div></div>
        ) : (
          <div className="rounded-3xl border border-ink/10 bg-white p-4 mb-6 text-center"><p className="text-sm text-ink/60"><Link href="/onboard" className="text-ink font-semibold underline">Sign in</Link> to join the conversation.</p></div>
        )}
        <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">{postTypes.map((tab) => (<button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-lime text-ink' : 'border border-ink/15 text-ink/70 hover:border-lime/30 hover:text-ink'}`}><tab.icon className="h-4 w-4" />{tab.label}</button>))}</div>
        {filteredPosts.length === 0 ? (<div className="rounded-3xl border border-ink/10 bg-white p-12 text-center"><MessageCircle className="h-10 w-10 text-ink/20 mx-auto mb-3" /><p className="text-ink/50">No messages yet. Start the conversation.</p></div>) : (<div className="space-y-3">{filteredPosts.map((post, i) => (<div key={post.id} className="rounded-2xl border border-ink/10 bg-white p-4 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}><div className="flex items-center gap-3 mb-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-xs font-bold text-ink">{post.user_id ? post.user_id.slice(0, 2).toUpperCase() : '??'}</div><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${typeColors[post.type] || 'bg-ink/5 text-ink'}`}>{post.type}</span><span className="text-xs text-ink/40 ml-auto">{timeAgo(post.created_at)}</span></div><p className="text-sm text-ink/80 leading-relaxed pl-11">{post.content}</p></div>))}</div>)}
      </div>
    </div>
  );
}
