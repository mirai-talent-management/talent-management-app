export type MatchScoreInput = {
  requiredTagIds: string[]
  supporterTagIds: string[]
  motivationLevel: number
  /** approved endorsement count per tag id, for this supporter */
  endorsementCountByTag: Map<string, number>
}

export type MatchScoreResult = {
  score: number
  matchedTagIds: string[]
  tagCoverage: number
  motivationScore: number
  endorsementBoost: number
}

const ENDORSEMENT_CAP = 5

/**
 * score = tagCoverage * 0.5 + motivationScore * 0.3 + endorsementBoost * 0.2
 * See project plan for rationale: this is the core "skill match + motivation
 * + peer endorsement" ranking, not a plain tag filter.
 */
export function computeMatchScore({
  requiredTagIds,
  supporterTagIds,
  motivationLevel,
  endorsementCountByTag,
}: MatchScoreInput): MatchScoreResult {
  const supporterTagSet = new Set(supporterTagIds)
  const matchedTagIds = requiredTagIds.filter((id) => supporterTagSet.has(id))

  const tagCoverage = requiredTagIds.length
    ? matchedTagIds.length / requiredTagIds.length
    : 0

  const motivationScore = motivationLevel / 5

  const endorsementSum = matchedTagIds.reduce(
    (sum, id) => sum + (endorsementCountByTag.get(id) ?? 0),
    0
  )
  const endorsementBoost = Math.min(endorsementSum, ENDORSEMENT_CAP) / ENDORSEMENT_CAP

  const score = tagCoverage * 0.5 + motivationScore * 0.3 + endorsementBoost * 0.2

  return { score, matchedTagIds, tagCoverage, motivationScore, endorsementBoost }
}
