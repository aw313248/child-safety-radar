import Image from 'next/image'

export type MascotPose =
  | 'hi'         // 打招呼揮手
  | 'guard'      // 舉盾守護
  | 'fly'        // 飛起舉拳
  | 'think'      // 摸下巴思考
  | 'thumbs-up'  // 比讚加油
  | 'search'     // 戴眼鏡查筆電
  | 'sleep'      // 側趴睡覺
  | 'angry'      // 抱胸生氣

interface Props {
  pose: MascotPose
  size?: number
  className?: string
  priority?: boolean
  alt?: string
}

const ALT_MAP: Record<MascotPose, string> = {
  'hi':        '小析揮手打招呼',
  'guard':     '小析舉盾守護',
  'fly':       '小析飛起舉拳',
  'think':     '小析在想事情',
  'thumbs-up': '小析比讚鼓勵',
  'search':    '小析戴眼鏡查資料',
  'sleep':     '小析睡著了',
  'angry':     '小析生氣',
}

export default function Mascot({ pose, size = 120, className, priority, alt }: Props) {
  return (
    <Image
      src={`/mascot/${pose}.png`}
      alt={alt ?? ALT_MAP[pose]}
      width={size}
      height={size}
      priority={priority}
      className={className}
      style={{
        objectFit: 'contain',
        width: size,
        height: size,
        // 輕微投影讓角色在任何背景都有存在感
        filter: 'drop-shadow(0 8px 16px rgba(15, 36, 68, 0.25))',
      }}
    />
  )
}
