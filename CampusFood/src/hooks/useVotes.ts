import { useEffect, useState } from 'react';

export type VoteOption = {
  id: string;
  label: string;
  votes: number;
};

export type VotePoll = {
  id: string;
  question: string;
  options: VoteOption[];
  startDate: string;
  endDate: string;
  active: boolean;
};

const POLL_KEY = 'campusfood_poll';
const VOTES_LOG_KEY = 'campusfood_votes_log'; // registro de quién votó qué, por encuesta

// { [pollId]: { [username]: optionId } }
type VotesLog = Record<string, Record<string, string>>;

function loadPoll(): VotePoll | null {
  try {
    const raw = localStorage.getItem(POLL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadVotesLog(): VotesLog {
  try {
    const raw = localStorage.getItem(VOTES_LOG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function useVotes(username: string | null) {
  const [poll, setPoll] = useState<VotePoll | null>(() => loadPoll());
  const [votesLog, setVotesLog] = useState<VotesLog>(() => loadVotesLog());

  useEffect(() => {
    if (poll) {
      localStorage.setItem(POLL_KEY, JSON.stringify(poll));
    } else {
      localStorage.removeItem(POLL_KEY);
    }
  }, [poll]);

  useEffect(() => {
    localStorage.setItem(VOTES_LOG_KEY, JSON.stringify(votesLog));
  }, [votesLog]);

  const isOpen = Boolean(
    poll && poll.active && poll.startDate <= todayISO() && todayISO() <= poll.endDate
  );

  const hasVoted = Boolean(poll && username && votesLog[poll.id]?.[username]);

  const createPoll = (question: string, optionLabels: string[], startDate: string, endDate: string) => {
    const newPoll: VotePoll = {
      id: `poll-${Date.now()}`,
      question,
      options: optionLabels.map((label, index) => ({ id: `opt-${index}-${Date.now()}`, label, votes: 0 })),
      startDate,
      endDate,
      active: true,
    };
    setPoll(newPoll);
  };

  const closePoll = () => {
    setPoll((current) => (current ? { ...current, active: false } : current));
  };

  const reopenPoll = () => {
    setPoll((current) => (current ? { ...current, active: true } : current));
  };

  const deletePoll = () => {
    setPoll(null);
  };

  const castVote = (optionId: string) => {
    if (!poll || !username || hasVoted) return;

    setPoll((current) => {
      if (!current) return current;
      return {
        ...current,
        options: current.options.map((option) =>
          option.id === optionId ? { ...option, votes: option.votes + 1 } : option
        ),
      };
    });

    setVotesLog((current) => ({
      ...current,
      [poll.id]: { ...(current[poll.id] ?? {}), [username]: optionId },
    }));
  };

  return { poll, isOpen, hasVoted, createPoll, closePoll, reopenPoll, deletePoll, castVote };
}