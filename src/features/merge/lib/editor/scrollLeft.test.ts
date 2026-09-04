import { describe, expect, it, vi } from 'vitest'
import { createHorizontalScrollSync } from './scrollLeft'

function fakeScroller(scrollLeft: number) {
  return { scrollLeft } as HTMLElement
}

describe('createHorizontalScrollSync', () => {
  it('把 source 的 scrollLeft 写到 target', () => {
    const sync = createHorizontalScrollSync()
    const source = fakeScroller(40)
    const target = fakeScroller(0)
    sync.onScroll(source, target)
    expect(target.scrollLeft).toBe(40)
  })

  it('值相同则不写，避免无意义赋值', () => {
    const sync = createHorizontalScrollSync()
    const source = fakeScroller(8)
    const target = fakeScroller(8)
    const setter = vi.fn()
    Object.defineProperty(target, 'scrollLeft', {
      get: () => 8,
      set: setter,
    })
    sync.onScroll(source, target)
    expect(setter).not.toHaveBeenCalled()
  })

  it('回写时不形成二次传播', () => {
    const sync = createHorizontalScrollSync()
    const a = fakeScroller(0)
    const b = fakeScroller(0)
    Object.defineProperty(a, 'scrollLeft', {
      get: () => 12,
      set: () => {
        sync.onScroll(a, b)
      },
      configurable: true,
    })
    b.scrollLeft = 0
    // 模拟 b 收到 a 的同步后再回调 a：锁位应挡住
    const inner = fakeScroller(12)
    sync.onScroll(inner, b)
    expect(b.scrollLeft).toBe(12)
  })
})
