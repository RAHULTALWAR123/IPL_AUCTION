-- At most one human seat per user per room (AI rows keep user_id NULL).
CREATE UNIQUE INDEX IF NOT EXISTS room_teams_one_user_per_room
  ON public.room_teams (room_id, user_id)
  WHERE user_id IS NOT NULL;
