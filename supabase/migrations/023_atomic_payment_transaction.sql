-- Atomic payment transaction with row-level locking
-- Prevents race conditions in concurrent payment requests

CREATE OR REPLACE FUNCTION record_payment_atomic(
  p_loan_id UUID,
  p_shop_id UUID,
  p_amount NUMERIC,
  p_method TEXT,
  p_kind TEXT,
  p_reference TEXT,
  p_paid_at TIMESTAMPTZ,
  p_notes TEXT
) RETURNS JSONB AS $$
DECLARE
  v_balance NUMERIC;
  v_interest_accrued NUMERIC;
  v_principal_amount NUMERIC;
  v_loan_status TEXT;
  v_payment_id UUID;
  v_new_balance NUMERIC;
  v_loan_closed BOOLEAN := FALSE;
BEGIN
  -- Lock the loan row to prevent concurrent modifications
  SELECT status, loan_amount INTO v_loan_status, v_principal_amount
  FROM loans
  WHERE id = p_loan_id AND shop_id = p_shop_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Loan not found.');
  END IF;
  
  IF v_loan_status NOT IN ('active', 'overdue') THEN
    RETURN jsonb_build_object('error', 'This loan is already closed.');
  END IF;
  
  -- Get current balance using existing loan_summary function
  SELECT balance, interest_accrued INTO v_balance, v_interest_accrued
  FROM loan_summary(p_loan_id)
  LIMIT 1;
  
  -- Overpayment guard
  IF p_amount > v_balance + 1 THEN
    RETURN jsonb_build_object(
      'error', format('Payment exceeds balance (outstanding ₹%s).', v_balance::text)
    );
  END IF;
  
  -- Validate payment kind
  IF p_kind = 'interest' AND p_amount > v_interest_accrued + 1 THEN
    RETURN jsonb_build_object(
      'error', format('Amount exceeds interest accrued (₹%s). Use "principal" or "mixed" for larger payments.', v_interest_accrued::text)
    );
  END IF;
  
  IF p_kind = 'principal' AND p_amount > v_principal_amount + 1 THEN
    RETURN jsonb_build_object(
      'error', format('Amount exceeds principal (₹%s). Use "mixed" for payments including interest.', v_principal_amount::text)
    );
  END IF;
  
  -- Insert payment
  INSERT INTO payments (loan_id, shop_id, amount, method, kind, reference, paid_at, notes)
  VALUES (p_loan_id, p_shop_id, p_amount, p_method, p_kind, p_reference, p_paid_at, p_notes)
  RETURNING id INTO v_payment_id;
  
  -- Calculate new balance
  v_new_balance := GREATEST(0, v_balance - p_amount);
  
  -- Close loan if balance is zero
  IF v_new_balance <= 0.01 THEN
    UPDATE loans
    SET status = 'closed', closed_at = NOW()
    WHERE id = p_loan_id;
    v_loan_closed := TRUE;
  END IF;
  
  RETURN jsonb_build_object(
    'payment', jsonb_build_object(
      'id', v_payment_id,
      'amount', p_amount,
      'method', p_method,
      'paid_at', p_paid_at
    ),
    'newBalance', v_new_balance,
    'loanClosed', v_loan_closed
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION record_payment_atomic TO authenticated;
