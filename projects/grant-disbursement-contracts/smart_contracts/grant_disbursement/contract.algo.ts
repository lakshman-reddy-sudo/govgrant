import type { gtxn } from '@algorandfoundation/algorand-typescript'
import {
  abimethod,
  Account,
  assert,
  assertMatch,
  Contract,
  Global,
  GlobalState,
  itxn,
  Txn,
  uint64,
  Uint64,
} from '@algorandfoundation/algorand-typescript'

/**
 * GrantDisbursement — Transparent Government Grant & Subsidy Distribution
 *
 * Roles:
 *   Authority (creator): creates grant, approves beneficiary, approves milestones
 *   Beneficiary:         applies (implicit), submits milestones
 *
 * Flow:
 *   createGrant → fundGrant → approveBeneficiary → submitMilestone(1)
 *   → approveMilestone(1) [→ submitMilestone(2) → approveMilestone(2)]
 */
export class GrantDisbursement extends Contract {
  // Metadata
  grantName = GlobalState<string>()

  // Participants
  authority = GlobalState<Account>()
  beneficiary = GlobalState<Account>()

  // Financials
  totalAmount = GlobalState<uint64>()
  numMilestones = GlobalState<uint64>()

  // Status flags (0 = false, 1 = true)
  isFunded = GlobalState<uint64>()
  beneficiaryApproved = GlobalState<uint64>()
  milestone1Submitted = GlobalState<uint64>()
  milestone1Approved = GlobalState<uint64>()
  milestone2Submitted = GlobalState<uint64>()
  milestone2Approved = GlobalState<uint64>()

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  @abimethod({ allowActions: 'NoOp', onCreate: 'require' })
  public createGrant(grantName: string, numMilestones: uint64): void {
    assert(numMilestones >= Uint64(1))
    assert(numMilestones <= Uint64(2))

    this.grantName.value = grantName
    this.authority.value = Txn.sender
    this.beneficiary.value = Account() // zero address until approved
    this.totalAmount.value = Uint64(0)
    this.numMilestones.value = numMilestones

    this.isFunded.value = Uint64(0)
    this.beneficiaryApproved.value = Uint64(0)
    this.milestone1Submitted.value = Uint64(0)
    this.milestone1Approved.value = Uint64(0)
    this.milestone2Submitted.value = Uint64(0)
    this.milestone2Approved.value = Uint64(0)
  }

  // ─── Authority actions ────────────────────────────────────────────────────

  /**
   * Authority sends Algos to fund the grant (locked in the app account).
   * The payment transaction must be included in the same atomic group.
   */
  public fundGrant(payment: gtxn.PaymentTxn): void {
    assertMatch(Txn, { sender: this.authority.value })
    assert(this.isFunded.value === Uint64(0))
    assertMatch(payment, { receiver: Global.currentApplicationAddress })
    assert(payment.amount > Uint64(0))

    this.totalAmount.value = payment.amount
    this.isFunded.value = Uint64(1)
  }

  /**
   * Authority designates a beneficiary and sets them as approved.
   */
  public approveBeneficiary(beneficiary: Account): void {
    assertMatch(Txn, { sender: this.authority.value })
    assert(this.isFunded.value === Uint64(1))
    assert(this.beneficiaryApproved.value === Uint64(0))

    this.beneficiary.value = beneficiary
    this.beneficiaryApproved.value = Uint64(1)
  }

  /**
   * Authority approves a milestone, triggering automatic fund release to the beneficiary.
   * Milestone 1: releases 50 % (or 100 % if single-milestone grant).
   * Milestone 2: releases the remaining 50 %.
   */
  public approveMilestone(milestoneNum: uint64): void {
    assertMatch(Txn, { sender: this.authority.value })
    assert(this.beneficiaryApproved.value === Uint64(1))

    if (milestoneNum === Uint64(1)) {
      assert(this.milestone1Submitted.value === Uint64(1))
      assert(this.milestone1Approved.value === Uint64(0))
      this.milestone1Approved.value = Uint64(1)

      // Single-milestone grant → release 100 %; two-milestone → release 50 %
      let payout: uint64 = this.totalAmount.value / Uint64(2)
      if (this.numMilestones.value === Uint64(1)) {
        payout = this.totalAmount.value
      }

      itxn
        .payment({
          receiver: this.beneficiary.value,
          amount: payout,
          fee: Uint64(0),
        })
        .submit()
    } else {
      assert(milestoneNum === Uint64(2))
      assert(this.numMilestones.value === Uint64(2))
      assert(this.milestone2Submitted.value === Uint64(1))
      assert(this.milestone2Approved.value === Uint64(0))
      this.milestone2Approved.value = Uint64(1)

      itxn
        .payment({
          receiver: this.beneficiary.value,
          amount: this.totalAmount.value / Uint64(2),
          fee: Uint64(0),
        })
        .submit()
    }
  }

  // ─── Beneficiary actions ──────────────────────────────────────────────────

  /**
   * Beneficiary marks a milestone as submitted for review.
   * Milestone 2 can only be submitted after milestone 1 is approved.
   */
  public submitMilestone(milestoneNum: uint64): void {
    assertMatch(Txn, { sender: this.beneficiary.value })
    assert(this.beneficiaryApproved.value === Uint64(1))

    if (milestoneNum === Uint64(1)) {
      assert(this.milestone1Submitted.value === Uint64(0))
      this.milestone1Submitted.value = Uint64(1)
    } else {
      assert(milestoneNum === Uint64(2))
      assert(this.numMilestones.value === Uint64(2))
      assert(this.milestone1Approved.value === Uint64(1))
      assert(this.milestone2Submitted.value === Uint64(0))
      this.milestone2Submitted.value = Uint64(1)
    }
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  /** Returns all remaining Algos to the authority and deletes the application. */
  @abimethod({ allowActions: 'DeleteApplication' })
  public deleteApplication(): void {
    assertMatch(Txn, { sender: this.authority.value })

    itxn
      .payment({
        receiver: this.authority.value,
        closeRemainderTo: this.authority.value,
        amount: Uint64(0),
        fee: Uint64(0),
      })
      .submit()
  }
}
