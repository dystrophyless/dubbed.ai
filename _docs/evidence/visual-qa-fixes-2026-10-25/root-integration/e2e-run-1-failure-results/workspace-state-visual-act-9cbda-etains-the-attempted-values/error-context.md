# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-state-visual.spec.ts >> actual Account screen >> invalid password is placed with the fields and retains the attempted values
- Location: e2e\workspace-state-visual.spec.ts:163:3

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Skip to content" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e5]:
    - generic [ref=e6]:
      - link "Dubbed — Home" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e8]: Dubbed
      - navigation "Main navigation" [ref=e9]:
        - link "New dub" [ref=e10] [cursor=pointer]:
          - /url: /new
        - link "Projects" [ref=e11] [cursor=pointer]:
          - /url: /projects
        - link "Credits" [ref=e12] [cursor=pointer]:
          - /url: /credits
        - link "Account" [ref=e13] [cursor=pointer]:
          - /url: /account
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Credits
          - strong [ref=e17]: "120"
        - generic [ref=e19]:
          - generic [ref=e20]: Language
          - combobox "Language" [ref=e21] [cursor=pointer]:
            - option "EN" [selected]
            - option "RU"
        - button "Sign out" [ref=e22] [cursor=pointer]
  - main [ref=e23]:
    - generic [ref=e25]:
      - generic [ref=e26]:
        - generic [ref=e27]:
          - heading "Account" [level=1] [ref=e28]
          - paragraph [ref=e29]: Manage your language, sign-in methods, and account access.
        - paragraph [ref=e30]: workspace-visual@example.invalid
      - status [ref=e31]: This preview uses simulated account data. Changes stay in this browser.
      - region [ref=e32]:
        - generic [ref=e33]:
          - heading "Language" [level=2] [ref=e34]
          - paragraph [ref=e40]: Choose the language used across Dubbed.
        - generic [ref=e41]:
          - generic [ref=e42]: Language
          - combobox "Language" [ref=e43]:
            - option "English" [selected]
            - option "Русский"
      - region [ref=e44]:
        - generic [ref=e45]:
          - heading "Sign-in methods" [level=2] [ref=e46]
          - paragraph [ref=e47]: These methods are reported by your account. Email addresses are not used to infer a link.
        - generic [ref=e48]:
          - generic [ref=e49]:
            - generic [ref=e56]:
              - heading "Google" [level=3] [ref=e57]
              - paragraph [ref=e58]: workspace-visual@example.invalid
              - paragraph [ref=e59]: Verified
            - generic [ref=e60]: Linked
          - generic [ref=e61]:
            - generic [ref=e63]: "@"
            - generic [ref=e64]:
              - heading "Email and password" [level=3] [ref=e65]
              - paragraph [ref=e66]: workspace-visual@example.invalid
              - paragraph [ref=e67]: Verified
            - generic [ref=e68]: Linked
          - generic [ref=e69]:
            - heading "Change password" [level=3] [ref=e70]
            - generic [ref=e71]:
              - generic [ref=e72]:
                - generic [ref=e73]: Current password
                - textbox "Current password" [invalid] [ref=e74]: incorrect-current-password
                - paragraph [ref=e75]: Current password is incorrect. Check it and try again.
              - generic [ref=e76]:
                - generic [ref=e77]: New password
                - textbox "New password" [ref=e78]: replacement-password-123
                - paragraph [ref=e79]: Use at least 8 characters. No character classes are required.
            - generic [ref=e80]:
              - button "Save password" [active] [ref=e81] [cursor=pointer]
              - button "Forgot password?" [ref=e82] [cursor=pointer]
      - region [ref=e85]:
        - generic [ref=e86]:
          - heading "Session" [level=2] [ref=e87]
          - paragraph [ref=e88]: Sign out from this device.
        - button "Sign out" [ref=e90] [cursor=pointer]
      - region [ref=e94]:
        - generic [ref=e95]:
          - heading "Delete account" [level=2] [ref=e96]
          - paragraph [ref=e97]: This action removes your access to account data and projects.
        - button "Delete account" [ref=e99] [cursor=pointer]
```