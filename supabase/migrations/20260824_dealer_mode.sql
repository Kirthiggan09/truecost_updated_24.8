-- 1. Custom Types
CREATE TYPE user_role AS ENUM ('buyer', 'dealer', 'admin');
CREATE TYPE inventory_status AS ENUM ('available', 'reserved', 'sold');
CREATE TYPE sales_status AS ENUM ('New', 'Contacted', 'Appointment', 'Test Drive', 'Converted', 'Not Proceeding');
CREATE TYPE enquiry_action AS ENUM ('Check Availability', 'Request Quotation', 'Request Dealer Contact', 'Book Test Drive');
CREATE TYPE enquiry_status AS ENUM ('Pending', 'Accepted', 'Rejected');

-- 2. Profiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role user_role DEFAULT 'buyer',
  full_name TEXT,
  contact_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Dealerships
CREATE TABLE public.dealerships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  credit_balance INT DEFAULT 0 CHECK (credit_balance >= 0),
  branding_logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Dealer Members
CREATE TABLE public.dealer_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES public.dealerships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT false,
  UNIQUE(dealership_id, user_id)
);

-- 5. Dealer Inventory
CREATE TABLE public.dealer_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES public.dealerships(id) ON DELETE CASCADE,
  car_name TEXT NOT NULL,
  stock_reference TEXT,
  selling_price NUMERIC,
  status inventory_status DEFAULT 'available',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Assessments
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('buyer', 'dealer')),
  created_by UUID REFERENCES public.profiles(id),
  dealership_id UUID REFERENCES public.dealerships(id),
  customer_reference TEXT,
  customer_name TEXT,
  customer_contact TEXT,
  safe_price_range JSONB,
  max_safe_monthly NUMERIC,
  risk_category TEXT,
  recommended_deposit NUMERIC,
  selected_car JSONB,
  alternative_cars JSONB,
  sales_status sales_status DEFAULT 'New',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Proposals
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  proposal_reference TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Enquiries
CREATE TABLE public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES public.profiles(id),
  dealership_id UUID REFERENCES public.dealerships(id),
  inventory_id UUID REFERENCES public.dealer_inventory(id),
  action_type enquiry_action,
  status enquiry_status DEFAULT 'Pending',
  contact_name TEXT,
  contact_details TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Credit Transactions
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id UUID REFERENCES public.dealerships(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Atomic Credit Deduction Function
CREATE OR REPLACE FUNCTION deduct_credits(
  p_dealership_id UUID,
  p_amount INT,
  p_transaction_type TEXT,
  p_reference_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  current_balance INT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM credit_transactions 
    WHERE reference_id = p_reference_id 
    AND transaction_type = p_transaction_type
  ) THEN
    RETURN TRUE;
  END IF;

  SELECT credit_balance INTO current_balance 
  FROM dealerships 
  WHERE id = p_dealership_id 
  FOR UPDATE;

  IF current_balance >= p_amount THEN
    UPDATE dealerships 
    SET credit_balance = credit_balance - p_amount 
    WHERE id = p_dealership_id;

    INSERT INTO credit_transactions (dealership_id, amount, transaction_type, reference_id)
    VALUES (p_dealership_id, -p_amount, p_transaction_type, p_reference_id);

    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
