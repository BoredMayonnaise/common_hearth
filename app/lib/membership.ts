import pool from "./db";

export type MembershipOption = {
  id: string;
  circle_id: string;
  circle_name: string;
  display_name: string;
};

export async function membershipsForUser(userId: string): Promise<MembershipOption[]> {
  const res = await pool.query(
    `SELECT m.id, m.circle_id, c.name AS circle_name, p.display_name
     FROM memberships m
     JOIN circles c ON c.id = m.circle_id
     JOIN profiles p ON p.user_id = m.user_id
     WHERE m.circle_id IN (SELECT circle_id FROM memberships WHERE user_id = $1)
     ORDER BY c.name, p.display_name`,
    [userId]
  );
  return res.rows;
}
