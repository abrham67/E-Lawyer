import React, { useState } from 'react';
import { Bot, X, Globe, Minimize2, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const AskAIBot: React.FC = () => {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [web, setWeb] = useState(true);
	const [loading, setLoading] = useState(false);
	const [answer, setAnswer] = useState<string | null>(null);
	const [sources, setSources] = useState<Array<{ title: string; link: string; snippet: string }> | null>(null);
	const [resultMinimized, setResultMinimized] = useState(false);
	const { toast } = useToast();

	const ask = async () => {
		if (!query || query.trim().length < 3) {
			toast({ variant: 'destructive', title: 'Please enter a longer question' });
			return;
		}
		setLoading(true);
		setAnswer(null);
		setSources(null);
		setResultMinimized(false);
		try {
			const res = await fetch('/api/ai/ask', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ query, web })
			});
			if (!res.ok) throw new Error('AI request failed');
			const data = await res.json();
			setAnswer(data.text || 'No answer');
			setSources(data.sources || null);
		} catch (e) {
			toast({ variant: 'destructive', title: 'AI error', description: 'Failed to get an answer' });
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			{/* Floating AI icon */}
			<button
				aria-label="Ask AI"
				onClick={() => setOpen(true)}
				className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90"
			>
				<Bot className="h-6 w-6" />
			</button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Bot className="h-5 w-5" /> Legal Research Assistant
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<label className="text-sm text-muted-foreground flex items-center gap-2">
								<Globe className="h-4 w-4" /> Include web sources
							</label>
							<Switch checked={web} onCheckedChange={setWeb as any} />
						</div>
						<Textarea
							placeholder="Ask about laws, procedures, or case studies…"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							rows={4}
						/>
						<div className="flex items-center justify-end gap-2">
							<Button variant="ghost" onClick={() => setOpen(false)}>
								<X className="h-4 w-4 mr-1" /> Close
							</Button>
							<Button onClick={ask} disabled={loading}>
								{loading ? 'Thinking…' : 'Ask AI'}
							</Button>
						</div>
						{(answer || (sources && sources.length > 0)) && (
							<div className="mt-2">
								{/* Results toolbar */}
								<div className="flex items-center justify-between mb-2">
									<div className="text-sm font-semibold">Results</div>
									<div className="flex items-center gap-1">
										<button
											className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
											title={resultMinimized ? 'Restore' : 'Minimize results'}
											onClick={() => setResultMinimized((v) => !v)}
										>
											{resultMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
										</button>
										<button
											className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
											title="Close results"
											onClick={() => { setAnswer(null); setSources(null); setResultMinimized(false); }}
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								</div>

								{!resultMinimized && (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{/* Answer column */}
										<div className="overflow-y-auto max-h-[50vh] border rounded-md p-3 bg-background">
											{answer && (
												<div className="prose prose-sm max-w-none whitespace-pre-wrap">{answer}</div>
											)}
										</div>
										{/* Sources column */}
										<div className="overflow-y-auto max-h-[50vh] border rounded-md p-3 bg-background">
											{sources && sources.length > 0 ? (
												<>
													<div className="text-xs font-semibold mb-1">Sources</div>
													<ul className="space-y-2 text-xs">
														{sources.map((s, i) => (
															<li key={i}>
																<a className="text-primary hover:underline" href={s.link} target="_blank" rel="noreferrer">{s.title}</a>
																<div className="text-muted-foreground mt-0.5">{s.snippet}</div>
															</li>
														))}
													</ul>
												</>
											) : (
												<div className="text-xs text-muted-foreground">No sources</div>
											)}
										</div>
									</div>
								)}
							</div>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default AskAIBot;
