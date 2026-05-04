'use client';

interface Message {
  role: string;
  content: string;
}

interface TranscriptViewerProps {
  transcript: Message[] | string | null;
}

export default function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  if (!transcript) return <p className="text-sm text-gray-400">No transcript available</p>;

  let messages: Message[] = [];
  if (typeof transcript === 'string') {
    messages = transcript.split('\n').filter(Boolean).map(line => {
      const match = line.match(/^(Prospect|Agent|CALLER|ALEX|AI|User):\s*(.*)/i);
      if (match) return { role: match[1].toLowerCase(), content: match[2] };
      return { role: 'unknown', content: line };
    });
  } else if (Array.isArray(transcript)) {
    messages = transcript;
  }

  return (
    <div className="space-y-3">
      {messages.map((msg, i) => {
        const isAI = ['assistant', 'agent', 'alex', 'ai'].includes(msg.role.toLowerCase());
        return (
          <div key={i} className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
              isAI ? 'bg-emerald-50 text-gray-800' : 'bg-gray-100 text-gray-800'
            }`}>
              <p className="text-[10px] font-semibold text-gray-400 mb-0.5 uppercase">
                {isAI ? 'Alex' : 'Caller'}
              </p>
              {msg.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
