export interface Profile {
  id: string
  email: string
  name: string | null
  selected_team_id: number | null
  squad: Array<{
    player_id: number
    name: string
    avatar: string
    role: string
    base_price: number
    sold_at: number
  }>
  budget: number
}
