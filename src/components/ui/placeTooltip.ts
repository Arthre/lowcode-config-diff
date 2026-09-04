export type TooltipPlacement = 'top' | 'bottom'

export type TooltipRect = {
  top: number
  left: number
  width: number
  height: number
}

export type TooltipSize = {
  width: number
  height: number
}

export type TooltipViewport = {
  width: number
  height: number
}

/** 按偏好方向放置气泡，空间不够则翻转，并水平夹进视口。 */
export function resolveTooltipPlacement(
  trigger: TooltipRect,
  tip: TooltipSize,
  preferred: TooltipPlacement,
  viewport: TooltipViewport,
  gap = 8,
  margin = 8,
): { placement: TooltipPlacement; top: number; left: number } {
  const centerLeft = trigger.left + trigger.width / 2 - tip.width / 2
  const left = Math.min(viewport.width - tip.width - margin, Math.max(margin, centerLeft))
  const topY = trigger.top - gap - tip.height
  const bottomY = trigger.top + trigger.height + gap
  const topFits = topY >= margin
  const bottomFits = bottomY + tip.height <= viewport.height - margin

  let placement = preferred
  if (preferred === 'top' && !topFits && bottomFits) placement = 'bottom'
  else if (preferred === 'bottom' && !bottomFits && topFits) placement = 'top'
  else if (!topFits && !bottomFits) {
    placement = trigger.top > viewport.height / 2 ? 'top' : 'bottom'
  }

  return {
    placement,
    top: placement === 'top' ? topY : bottomY,
    left,
  }
}
