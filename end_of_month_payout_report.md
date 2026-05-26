# 📊 Comprehensive Trade-by-Trade Audit Report

This report presents a granular, trade-by-trade audit of the **Capped at +4R System** and the **End-of-Month (EOM) Payout System** over your 36-month dataset (FOMC Excluded).

## 🚨 Critical Discovery: The "Reset Vulnerability" vs. "Profit Cushion"

Your warning was **100% correct**! By running a microscopic trade-by-trade audit instead of a monthly-aggregated simulation, we uncovered a vital structural difference in how drawdown limits are hit:

### 1. Capped at +4R (Carryover) System: **3 Blowouts!**
In this system, every time you hit +4R, the account immediately resets to 0R. 
* **The Vulnerability:** Because you reset to 0R, you are constantly stripped of your profits and placed right at the edge of the cliff. When a drawdown streak starts immediately after a reset, you have no buffer.
* **The Result:** You hit the absolute **-10R drawdown limit** and blew the account **3 times**:
  1. 🚨 **July 26, 2024:** Hit -10.00R (breached).
  2. 🚨 **October 18, 2024:** Hit -10.00R (breached).
  3. 🚨 **December 11, 2025:** Hit -10.00R (breached).

### 2. End-of-Month (EOM) Payout System: **0 Blowouts!**
In this system, you trade the entire calendar month and withdraw your ending balance at the end of the month, carrying over negative balances.
* **The Cushion:** Because you do not reset mid-month, you accumulate a **profit cushion** (e.g., reaching +6R or +8R) during winning streaks. When a subsequent losing streak occurs, it eats into your cushion rather than blowing the account.
* **The Result:** **0 accounts blown!** Even during the July 2024 drawdown streak, the account only went down to a safe **-1.00R** because your early-month profit buffer protected you!

---

## 📈 Comparison Table

| Metric | Capped at +4R (Carryover) | End of Month (Carryover) |
| :--- | :---: | :---: |
| **Total Payouts Received** | **47 payouts** | **23 payouts** |
| **Total R Extracted** | **+188.00R** | **+173.20R** |
| **Accounts Blown (-10R)** | **3 accounts blown** 🚨 | **0 accounts blown** 🏆 |
| **Reset Downtime (Weeks)** | **6 to 8 weeks** lost passing tests | **0 weeks** lost |
| **Evaluation Costs** | **$450 - $900** in new test fees | **$0** |

---

## 💡 The Strategic Conclusion

If you choose the **Capped at +4R System**, you will get more payouts on paper (+188R vs +173R), but **you will blow 3 accounts**, costing you hundreds of dollars in evaluation fees and forcing you to stop trading for weeks while you pass new tests.

If you choose the **End-of-Month System**, you get a highly lucrative **+173.20R** payout stream, **you preserve your funded accounts with a 100% survival rate**, and you never experience a single day of trading downtime!
