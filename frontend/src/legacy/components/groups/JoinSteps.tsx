import { Check, MessageCircle, Send, UserCheck, X } from 'lucide-react';
import { Reveal, RevealItem } from '../motion/Reveal';
import { cn } from '../../utils/cn';

export type JoinStatus = 'none' | 'pending' | 'approved' | 'rejected';
type StepState = 'done' | 'current' | 'todo' | 'declined';

/** The three steps from asking to join to getting the chat link, with the visitor's own progress marked. */
export const JoinSteps = ({ status }: { status: JoinStatus }) => {
  const steps: { icon: typeof Send; title: string; text: string; state: StepState }[] = [
    {
      icon: Send,
      title: 'Ask to join',
      text: status === 'none' ? 'Send a request. It takes one tap.' : 'Your request reached the host.',
      state: status === 'none' ? 'current' : 'done',
    },
    {
      icon: UserCheck,
      title: status === 'rejected' ? 'Host declined' : 'Host approves',
      text:
        status === 'rejected'
          ? "The host couldn't fit you on this trip."
          : status === 'approved'
            ? 'The host said yes.'
            : status === 'pending'
              ? 'Waiting for the host to review it.'
              : 'The host reviews each request.',
      state: status === 'rejected' ? 'declined' : status === 'approved' ? 'done' : status === 'pending' ? 'current' : 'todo',
    },
    {
      icon: MessageCircle,
      title: 'Chat unlocks',
      text: status === 'approved' ? 'The group chat link is yours.' : 'You get the group chat link to plan with the crew.',
      state: status === 'approved' ? 'done' : 'todo',
    },
  ];

  return (
    <Reveal stagger={0.1} as="div" className="grid sm:grid-cols-3 gap-3">
      {steps.map(({ icon: Icon, title, text, state }, i) => (
        <RevealItem
          key={title}
          className={cn(
            'relative rounded-[22px] border p-5 h-full',
            state === 'current' && 'bg-paper border-accent/40 card-shadow',
            state === 'done' && 'bg-[#DDEEE4]/60 border-[#2F7D5B]/20',
            state === 'declined' && 'bg-[#FDF3F1] border-[#F2C9C2]',
            state === 'todo' && 'bg-paper/60 border-line'
          )}
        >
          <div className="flex items-center justify-between mb-4">
            <span
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                state === 'current' && 'bg-accent text-white',
                state === 'done' && 'bg-[#2F7D5B] text-white',
                state === 'declined' && 'bg-[#B42318] text-white',
                state === 'todo' && 'bg-stone text-muted'
              )}
            >
              {state === 'done' ? <Check className="w-4 h-4" /> : state === 'declined' ? <X className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </span>
            <span className="text-label text-muted flex items-center gap-2">
              {state === 'current' && <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot" aria-hidden />}
              {state === 'current' ? 'You are here' : `Step ${i + 1}`}
            </span>
          </div>
          <p className={cn('font-display text-xl leading-snug', state === 'declined' ? 'text-[#8A1C12]' : state === 'todo' ? 'text-body' : 'text-ink')}>{title}</p>
          <p className={cn('text-sm mt-1.5 leading-relaxed', state === 'declined' ? 'text-[#8A1C12]/80' : 'text-muted')}>{text}</p>
        </RevealItem>
      ))}
    </Reveal>
  );
};
