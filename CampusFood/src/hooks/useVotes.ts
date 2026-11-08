import { useCallback, useEffect, useState } from 'react';

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
  // Vigente hoy según la hora de Chile (lo calcula el servidor).
  open?: boolean;
};

const POLL_INTERVAL_MS = 20000;

type PollsResponse = {
  poll?: VotePoll | null;
  history?: VotePoll[];
  myVotes?: Record<string, string>;
  error?: string;
};

type PollsState = {
  owner: string | null;
  poll: VotePoll | null;
  history: VotePoll[];
  myVotes: Record<string, string>;
};

async function requestPolls(url: string, init?: RequestInit): Promise<PollsResponse> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });

  let data: PollsResponse = {};

  try {
    data = (await response.json()) as PollsResponse;
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error ?? 'No fue posible completar la operación.');
  }

  return data;
}

/**
 * Encuestas guardadas en la base de datos. Los votos se cuentan en el servidor y
 * un usuario solo puede votar una vez por encuesta.
 */
export function useVotes(userId: string | null) {
  const [state, setState] = useState<PollsState>({
    owner: null,
    poll: null,
    history: [],
    myVotes: {},
  });
  const [error, setError] = useState<string | null>(null);

  const current = state.owner === userId ? state : { poll: null, history: [], myVotes: {} };
  const poll = current.poll;

  const apply = useCallback(
    (data: PollsResponse) => {
      if (!userId) {
        return;
      }

      setState({
        owner: userId,
        poll: data.poll ?? null,
        history: data.history ?? [],
        myVotes: data.myVotes ?? {},
      });
    },
    [userId]
  );

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      apply(await requestPolls('/api/polls'));
    } catch (requestError) {
      console.error('No se pudieron cargar las encuestas:', requestError);
    }
  }, [userId, apply]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const first = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [userId, refresh]);

  const run = async (url: string, init: RequestInit) => {
    try {
      apply(await requestPolls(url, init));
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible completar la operación.'
      );

      await refresh();
    }
  };

  const isOpen = Boolean(poll?.open);

  const hasVoted = Boolean(poll && current.myVotes[poll.id]);

  const createPoll = (
    question: string,
    optionLabels: string[],
    startDate: string,
    endDate: string
  ) =>
    run('/api/polls', {
      method: 'POST',
      body: JSON.stringify({ question, options: optionLabels, startDate, endDate }),
    });

  const changeState = (action: 'close' | 'reopen' | 'archive') =>
    poll
      ? run(`/api/polls/${poll.id}`, { method: 'PATCH', body: JSON.stringify({ action }) })
      : Promise.resolve();

  const closePoll = () => changeState('close');
  const reopenPoll = () => changeState('reopen');
  // La encuesta vigente pasa al historial (no se borra: conserva sus votos).
  const deletePoll = () => changeState('archive');

  const castVote = (optionId: string) => {
    if (!poll || hasVoted) {
      return Promise.resolve();
    }

    return run(`/api/polls/${poll.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'vote', optionId }),
    });
  };

  return {
    poll,
    history: current.history,
    isOpen,
    hasVoted,
    error,
    clearError: () => setError(null),
    createPoll,
    closePoll,
    reopenPoll,
    deletePoll,
    castVote,
  };
}
