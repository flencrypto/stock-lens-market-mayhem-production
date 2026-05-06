'use strict';

const { DEFAULT_LEAGUE_ID, addAudit } = require('./dataStore');
const { generateTrumpCards } = require('./marketData');
const { uid, nowIso, hashNumber, clamp } = require('./utils');

const STATS = [
  { key: 'momentum', label: 'Momentum' },
  { key: 'volatility', label: 'Volatility' },
  { key: 'volumeSurge', label: 'Volume Surge' },
  { key: 'newsHeat', label: 'News Heat' },
  { key: 'quality', label: 'Quality' },
  { key: 'marketMuscle', label: 'Market Muscle' },
  { key: 'risk', label: 'Risk Rating' }
];

function shuffleDeterministic(items, seedText) {
  return items
    .map((item, index) => ({ item, score: hashNumber(`${seedText}:${item.id}:${index}`) }))
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.item);
}

function botUser() {
  return {
    id: 'bot_market_mayhem',
    displayName: 'Market Mayhem Bot',
    avatarUrl: ''
  };
}

async function createChallenge(data, user, input = {}) {
  const leagueId = input.leagueId || DEFAULT_LEAGUE_ID;
  const allCards = await generateTrumpCards(24);
  const seed = `${user.id}:${nowIso()}:${input.toUserId || 'bot'}`;
  const deck = shuffleDeterministic(allCards, seed);
  const playerDeck = deck.slice(0, 5);
  const opponentDeck = deck.slice(5, 10);
  const toUserId = input.toUserId || botUser().id;
  const challenge = {
    id: uid('challenge'),
    leagueId,
    fromUserId: user.id,
    toUserId,
    status: 'active',
    roundIndex: 0,
    playerScore: 0,
    opponentScore: 0,
    playerDeck,
    opponentDeck,
    winnerId: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  data.challenges.push(challenge);
  addAudit(data, 'CHALLENGE_CREATED', user.id, { challengeId: challenge.id, toUserId });
  return publicChallenge(challenge, user.id);
}

function chooseBotStat(card) {
  let best = STATS[0].key;
  let bestValue = -Infinity;
  for (const stat of STATS) {
    const value = card.stats[stat.key];
    if (value > bestValue) {
      best = stat.key;
      bestValue = value;
    }
  }
  return best;
}

function publicChallenge(challenge, viewerId) {
  const isPlayer = challenge.fromUserId === viewerId;
  const myDeck = isPlayer ? challenge.playerDeck : challenge.opponentDeck;
  const theirDeck = isPlayer ? challenge.opponentDeck : challenge.playerDeck;
  return {
    id: challenge.id,
    status: challenge.status,
    roundIndex: challenge.roundIndex,
    playerScore: challenge.playerScore,
    opponentScore: challenge.opponentScore,
    myScore: isPlayer ? challenge.playerScore : challenge.opponentScore,
    theirScore: isPlayer ? challenge.opponentScore : challenge.playerScore,
    myNextCard: myDeck[challenge.roundIndex] || null,
    theirNextCardHidden: theirDeck[challenge.roundIndex] ? true : false,
    roundsRemaining: Math.max(0, 5 - challenge.roundIndex),
    winnerId: challenge.winnerId,
    createdAt: challenge.createdAt,
    updatedAt: challenge.updatedAt
  };
}

function publicRound(round) {
  return {
    id: round.id,
    challengeId: round.challengeId,
    roundNumber: round.roundNumber,
    chosenStat: round.chosenStat,
    chosenStatLabel: STATS.find((item) => item.key === round.chosenStat)?.label || round.chosenStat,
    playerCard: round.playerCard,
    opponentCard: round.opponentCard,
    playerValue: round.playerValue,
    opponentValue: round.opponentValue,
    winnerSide: round.winnerSide,
    createdAt: round.createdAt
  };
}

function resolveWinner(challenge) {
  if (challenge.playerScore === challenge.opponentScore) {
    // Sudden-death tiebreaker: total stat strength across used hand.
    const playerTotal = challenge.playerDeck.reduce((sum, card) => sum + Object.values(card.stats).reduce((a, b) => a + b, 0), 0);
    const oppTotal = challenge.opponentDeck.reduce((sum, card) => sum + Object.values(card.stats).reduce((a, b) => a + b, 0), 0);
    return playerTotal >= oppTotal ? challenge.fromUserId : challenge.toUserId;
  }
  return challenge.playerScore > challenge.opponentScore ? challenge.fromUserId : challenge.toUserId;
}

async function playRound(data, user, challengeId, input = {}) {
  const challenge = data.challenges.find((item) => item.id === challengeId);
  if (!challenge) {
    const error = new Error('Challenge not found');
    error.statusCode = 404;
    throw error;
  }
  if (challenge.status !== 'active') {
    const error = new Error('Challenge already completed');
    error.statusCode = 409;
    throw error;
  }
  if (![challenge.fromUserId, challenge.toUserId].includes(user.id) && challenge.toUserId !== botUser().id) {
    const error = new Error('You are not part of this challenge');
    error.statusCode = 403;
    throw error;
  }
  const roundNumber = challenge.roundIndex + 1;
  const playerCard = challenge.playerDeck[challenge.roundIndex];
  const opponentCard = challenge.opponentDeck[challenge.roundIndex];
  if (!playerCard || !opponentCard) {
    challenge.status = 'complete';
    challenge.winnerId = resolveWinner(challenge);
    return { challenge: publicChallenge(challenge, user.id), round: null };
  }
  const requestedStat = String(input.stat || '').trim();
  const chosenStat = STATS.some((stat) => stat.key === requestedStat) ? requestedStat : chooseBotStat(playerCard);
  const playerValue = clamp(Number(playerCard.stats[chosenStat] || 0), 0, 999);
  const opponentValue = clamp(Number(opponentCard.stats[chosenStat] || 0), 0, 999);
  const winnerSide = playerValue === opponentValue ? 'draw' : (playerValue > opponentValue ? 'player' : 'opponent');
  if (winnerSide === 'player') challenge.playerScore += 1;
  if (winnerSide === 'opponent') challenge.opponentScore += 1;
  challenge.roundIndex += 1;
  challenge.updatedAt = nowIso();
  if (challenge.roundIndex >= 5) {
    challenge.status = 'complete';
    challenge.winnerId = resolveWinner(challenge);
  }
  const round = {
    id: uid('round'),
    challengeId: challenge.id,
    roundNumber,
    chosenStat,
    playerCard,
    opponentCard,
    playerValue,
    opponentValue,
    winnerSide,
    createdAt: nowIso()
  };
  data.challengeRounds.push(round);
  addAudit(data, 'CHALLENGE_ROUND_PLAYED', user.id, { challengeId, roundNumber, chosenStat, winnerSide });
  return { challenge: publicChallenge(challenge, user.id), round: publicRound(round) };
}

function listChallenges(data, userId) {
  return data.challenges
    .filter((challenge) => [challenge.fromUserId, challenge.toUserId].includes(userId) || challenge.toUserId === botUser().id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20)
    .map((challenge) => publicChallenge(challenge, userId));
}

function challengeLeaderboard(data) {
  const scores = new Map();
  function row(userId) {
    if (!scores.has(userId)) scores.set(userId, { userId, wins: 0, losses: 0, played: 0, points: 0 });
    return scores.get(userId);
  }
  for (const challenge of data.challenges.filter((item) => item.status === 'complete' && item.winnerId)) {
    const users = [challenge.fromUserId, challenge.toUserId].filter((id) => id && id !== botUser().id);
    for (const userId of users) {
      const entry = row(userId);
      entry.played += 1;
      if (challenge.winnerId === userId) {
        entry.wins += 1;
        entry.points += 3;
      } else {
        entry.losses += 1;
      }
    }
  }
  return Array.from(scores.values()).sort((a, b) => b.points - a.points || b.wins - a.wins).map((entry, index) => ({ ...entry, rank: index + 1 }));
}

module.exports = {
  STATS,
  botUser,
  createChallenge,
  playRound,
  listChallenges,
  challengeLeaderboard
};
