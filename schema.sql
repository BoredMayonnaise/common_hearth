-- Common Hearth — MVP schema (Day 2)
-- Every screen field maps to a column. No comments table.

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles (
  user_id          uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name     text NOT NULL,
  how_i_show_up    text NOT NULL,                -- one line
  region_or_role_tag text,                       -- optional
  changed_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE circles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  purpose     text,                              -- one line
  created_by  uuid NOT NULL REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id  uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

CREATE TABLE invite_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  circle_id  uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  max_uses   integer,                            -- optional
  expires_at timestamptz,                        -- optional
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id   uuid NOT NULL REFERENCES circles(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES users(id),
  title       text NOT NULL,
  situation   text NOT NULL,
  steps       text NOT NULL,
  never_promise text NOT NULL,
  access_notes  text,
  contact       text,
  carrier_id  uuid REFERENCES memberships(id),
  handoff_on  date,
  received_at timestamptz,
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notes_circle_id_idx ON notes (circle_id);
CREATE INDEX memberships_user_id_idx ON memberships (user_id);
