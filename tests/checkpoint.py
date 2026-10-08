"""Day 11 checkpoint: five break-it tests against the live site."""
import os
import subprocess
import time

from playwright.sync_api import sync_playwright

BASE = "https://commonhearth.duckdns.org"
DB = ""
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app", ".env.local")) as fh:
    for line in fh:
        if line.startswith("DATABASE_URL="):
            DB = line.split("=", 1)[1].strip()
# Unique per run: a fixed title piled up duplicates and the last-edit and handoff
# checks started hitting the wrong row.
TAG = f"{int(time.time()) % 100000:05d}"
EDIT_TARGET = f"Edit target note {TAG}"
HANDOFF_NOTE = f"Handoff test note {TAG}"
results = []
# Notes this run creates, removed again at the end so repeated runs do not fill
# the demo circle with rows that then show up in the home feed.
created_note_ids = []


def note_id(title):
    """The id of the note with this exact title, newest first."""
    r = subprocess.run(
        ["psql", DB, "-tAc",
         f"SELECT id FROM notes WHERE title = '{title}' ORDER BY created_at DESC LIMIT 1"],
        capture_output=True, text=True,
    ).stdout.strip()
    return r or None

def clear_throttle():
    """Start from a clean rate-limit budget so the suite is not locked out by its
    own earlier runs (every sign-in counts, not just failures)."""
    subprocess.run(["psql", DB, "-tAc", "DELETE FROM auth_throttle"], capture_output=True, text=True)


def check(name, ok, detail=""):
    results.append((name, ok))
    print(("PASS" if ok else "FAIL"), "-", name, detail if not ok else "")

def login(page, email, password):
    page.goto(f"{BASE}/login", wait_until="load")
    page.fill('input[name=email]', email)
    page.fill('input[name=password]', password)
    page.click('button[type=submit]')
    page.wait_for_url('**/', timeout=20000)


def main_text(page):
    """Settled text, so a mid-hydration read cannot fake a pass or a fail."""
    page.wait_for_selector("main", timeout=20000)
    page.wait_for_timeout(700)
    return page.inner_text("main")

clear_throttle()

with sync_playwright() as p:
    b = p.chromium.launch()

    # 1. Outsider read fails: carol has no circles -> no notes from alice/bob
    page = b.new_page()
    login(page, 'carol@example.com', 'password9999')
    page.wait_for_timeout(800)
    page.goto(f"{BASE}/notes", wait_until="load")
    t = main_text(page)
    check("outsider read fails (carol sees no member notes)", 'Sunday' not in t and 'Dave Circle' not in t and 'Rhymvex' not in t)
    page.close()

    # 2. Member edit works: alice edits 'dsvs' note title
    page = b.new_page()
    login(page, 'alice@example.com', 'password1234')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/notes/new", wait_until="load")
    page.select_option('select[name=circle_id]', label='Test Circle')
    page.fill('input[name=title]', EDIT_TARGET)
    page.fill('textarea[name=situation]', 'Situation')
    page.fill('textarea[name=steps]', '1) Step')
    page.fill('textarea[name=never_promise]', 'Never X')
    page.click('button:has-text("Save note")')
    page.wait_for_url('**/notes')
    page = b.new_page()
    login(page, 'alice@example.com', 'password1234')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/notes", wait_until="load")
    created_note_ids.append(note_id(EDIT_TARGET))
    page.locator('li', has_text=EDIT_TARGET).first.get_by_role('link', name='Edit').click()
    page.wait_for_url('**/edit', wait_until="load")
    page.fill('input[name=title]', 'dsvs (edited)')
    page.click('button:has-text("Save changes")')
    page.wait_for_url('**/notes', wait_until="load")
    check("member edit works", '(edited)' in main_text(page))
    page.close()

    # 3. Handoff works: alice creates note -> bob marks received -> carrier changes
    page = b.new_page()
    login(page, 'alice@example.com', 'password1234')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/notes/new")
    page.select_option('select[name=circle_id]', label='Test Circle')
    page.fill('input[name=title]', HANDOFF_NOTE)
    page.fill('textarea[name=situation]', 'Situation')
    page.fill('textarea[name=steps]', '1) Step')
    page.fill('textarea[name=never_promise]', 'Never X')
    page.select_option('select[name=carrier_id]', label='Alice — Test Circle')
    page.click('button:has-text("Save note")')
    page.wait_for_url('**/notes', wait_until="load")
    created_note_ids.append(note_id(HANDOFF_NOTE))
    page.close()
    page = b.new_page()
    login(page, 'bob@example.com', 'password5678')
    page.goto(f"{BASE}/notes", wait_until="load")
    main_text(page)  # wait for the list to actually be on screen
    # Scope to the all-notes list and take the first hit: the same note also sits in
    # "who is carrying what", so a bare locator would match both.
    row = page.locator('section[aria-labelledby=all-notes-heading] li', has_text=HANDOFF_NOTE).first
    check("handoff note is listed for bob", row.count() == 1, "row not found")
    row.get_by_role('button', name='Mark handoff received').click()
    page.wait_for_timeout(2000)
    main_text(page)
    # The note must leave "who is carrying what". Asserting the whole list is empty
    # only ever held on the first run -- every past run leaves Bob carrying its note.
    carrying = page.locator('section[aria-labelledby=carrying-heading] li').all_inner_texts()
    check("handoff works (received_at set, carrier reassigned)",
          not any(HANDOFF_NOTE in row for row in carrying), f"still carrying: {carrying}")
    page.close()

    # 4. Bad invite code fails
    page = b.new_page()
    login(page, 'carol@example.com', 'password9999')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/circle", wait_until="load")
    page.click('summary:has-text("Or enter a code")')  # code form is behind a fallback now
    page.fill('input[name=code]', 'not-a-real-code')
    page.click('button:has-text("Join circle")')
    page.wait_for_timeout(1500)
    t = main_text(page) + page.url
    check("bad invite code fails", 'join=invalid' in page.url and 'That code does not work' in page.inner_text('main'))
    page.close()

    # 5. Profile visible only inside circle: dave (Dave Circle only) cannot see Alice's profile on a shared circle
    page = b.new_page()
    login(page, 'dave@example.com', 'password1111')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/circle", wait_until="load")
    t = main_text(page)
    check("profile visible only inside circle (dave cannot see Alice)", 'Alice —' not in t and 'Steady check-ins' not in t)
    # and alice can see bob in the shared circle
    page.close()
    page = b.new_page()
    login(page, 'alice@example.com', 'password1234')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/circle", wait_until="load")
    check("profiles shared inside the circle", 'Meal drop-offs' in main_text(page))
    b.close()

# Remove this run's notes so the demo data stays clean.
clear_throttle()

if created_note_ids:
    ids = ", ".join(f"'{n}'::uuid" for n in created_note_ids if n)
    subprocess.run(["psql", DB, "-tAc", f"DELETE FROM notes WHERE id IN ({ids})"],
                   capture_output=True, text=True)

print()
failed = [n for n, ok in results if not ok]
print("RESULT:", "ALL PASS" if not failed else f"{len(failed)} FAILURES: {failed}")
