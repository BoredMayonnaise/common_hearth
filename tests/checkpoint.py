"""Day 11 checkpoint: five break-it tests against the live site."""
from playwright.sync_api import sync_playwright

BASE = "http://134.185.84.235"
results = []

def check(name, ok):
    results.append((name, ok))
    print(("PASS" if ok else "FAIL"), "-", name)

def login(page, email, password):
    page.goto(f"{BASE}/login")
    page.fill('input[name=email]', email)
    page.fill('input[name=password]', password)
    page.click('button[type=submit]')

with sync_playwright() as p:
    b = p.chromium.launch()

    # 1. Outsider read fails: carol has no circles -> no notes from alice/bob
    page = b.new_page()
    login(page, 'carol@example.com', 'password9999')
    page.wait_for_timeout(800)
    page.goto(f"{BASE}/notes")
    t = page.inner_text('main')
    check("outsider read fails (carol sees no member notes)", 'Sunday' not in t and 'Dave Circle' not in t and 'Rhymvex' not in t)
    page.close()

    # 2. Member edit works: alice edits 'dsvs' note title
    page = b.new_page()
    login(page, 'alice@example.com', 'password1234')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/notes")
    page.click('text=Edit')
    page.wait_for_url('**/edit')
    page.fill('input[name=title]', 'dsvs (edited)')
    page.click('button:has-text("Save changes")')
    page.wait_for_url('**/notes')
    check("member edit works", '(edited)' in page.inner_text('main'))
    page.close()

    # 3. Handoff works: alice creates note -> bob marks received -> carrier changes
    page = b.new_page()
    login(page, 'alice@example.com', 'password1234')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/notes/new")
    page.select_option('select[name=circle_id]', label='Test Circle')
    page.fill('input[name=title]', 'Handoff test note')
    page.fill('textarea[name=situation]', 'Situation')
    page.fill('textarea[name=steps]', '1) Step')
    page.fill('textarea[name=never_promise]', 'Never X')
    page.select_option('select[name=carrier_id]', label='Alice — Test Circle')
    page.click('button:has-text("Save note")')
    page.wait_for_url('**/notes')
    page.close()
    page = b.new_page()
    login(page, 'bob@example.com', 'password5678')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/notes")
    page.click('button:has-text("Mark handoff received")')
    page.wait_for_timeout(1500)
    check("handoff works (received_at set, carrying list emptied)",
          'Nothing is currently handed off' in page.inner_text('main'))
    page.close()

    # 4. Bad invite code fails
    page = b.new_page()
    login(page, 'carol@example.com', 'password9999')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/circle")
    page.fill('input[name=code]', 'not-a-real-code')
    page.click('button:has-text("Join")')
    page.wait_for_timeout(1200)
    t = page.inner_text('main') + page.url
    check("bad invite code fails", 'join=invalid' in page.url and 'That code does not work' in page.inner_text('main'))
    page.close()

    # 5. Profile visible only inside circle: dave (Dave Circle only) cannot see Alice's profile on a shared circle
    page = b.new_page()
    login(page, 'dave@example.com', 'password1111')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/circle")
    check("profile visible only inside circle (dave cannot see Alice)", 'Alice —' not in page.inner_text('main') and 'Steady check-ins' not in page.inner_text('main'))
    # and alice can see bob in the shared circle
    page.close()
    page = b.new_page()
    login(page, 'alice@example.com', 'password1234')
    page.wait_for_url('**/')
    page.goto(f"{BASE}/circle")
    check("profiles shared inside the circle", 'Meal drop-offs' in page.inner_text('main'))
    b.close()

print()
failed = [n for n, ok in results if not ok]
print("RESULT:", "ALL PASS" if not failed else f"{len(failed)} FAILURES: {failed}")
