import type { PersonaAvatar } from '@shared/types'

/** Monogram + 2-colour gradient circle. Inverse (dark) text reads on the accent. */
export function Avatar({
  avatar,
  size = 40,
  glow = true,
  ring
}: {
  avatar: PersonaAvatar
  size?: number
  /** Soft accent glow under the disc. */
  glow?: boolean
  /** Optional ring colour (e.g. to mark the active library entry). */
  ring?: string
}) {
  const [from, to] = avatar.gradient
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-mono font-bold text-[#0a0a0b]"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: `linear-gradient(140deg, ${from}, ${to})`,
        boxShadow: [
          glow ? `0 0 18px -4px ${from}8c` : '',
          ring ? `0 0 0 2px ${ring}` : ''
        ]
          .filter(Boolean)
          .join(', ')
      }}
    >
      {avatar.monogram}
    </div>
  )
}
