/** Codeva account guidance shown when a cloud model is plan-restricted. */
export function getModelPlanRestrictionMessage(modelId: string): string {
  return [
    `Access denied: “${modelId}” is not included in your current Codeva plan.`,
    'Review available plans at https://www.cybermindcli.info/pricing.',
    'Free accounts can use Trinity or Kali.',
  ].join('\n');
}
