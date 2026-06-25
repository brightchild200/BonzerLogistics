# TODO (LogiSales)

- [x] Update README.md with correct enquiry detail route and express-backend connection steps.


- admin ka logic (admin ko sare salespersons ki attendacne dikhegi)  -- done
- admin and sales manager ko sari enquiries dikhengi irrespective of salesperon along with the name of salesperon --done
- admin and sales manager ko sare visits dikhenge of all salespersns --done
- dashboard mein right side mein attendance dikhao --done
- visits mein location access mat dikhao (for sales_person)  and calendar view , sab pe restrictions ki yeh format mein hi chahiye 
- remove qoutation from salesperosn enquiry --done
- register page pe sales manager bhi dalo --done
- apply on email many roles 
- admin and sales_manager target de sakte hai salesperson ko about no. of enquires and monthly sales , also visits 
- salesperosn and sales_manager cna also trakcing the jobs but cannot upadte it ( view mode only) (future)
- job no. pattern : BONLOG/mode_ka_2_char_code/financial yr/System-Wide Running Sequence Number (0001)
- do kyc of the customer ( enquiry se leke job conversion ke bich meine )  reminder msgs k yeh nahi hua hai (profile section mein)
- followup date (optional)
- dashboard pe followup ka preview ( next day wale )
- dashboard pe alerts like cs se ya koi bhi cross role activity ho rahi hai uske liye 
- ek announcement bar (moving marquee) chahiye on top & admin can put msg on this 
- enquireis mein assigned_user banan 
- roles and user_roles table creation 
- RPC-based dashboard aggregations and business workflows 

## Team Visibility Work
- [x] Update attendance page so `admin` and `sales_manager` can see every salesperson's attendance.
- [x] Update enquiries page so `admin` and `sales_manager` can see all enquiries with the salesperson name shown beside each record.
- [x] Update customer visits page so `admin` and `sales_manager` can see all visits made by all salespersons.
- [x] Keep non-manager users restricted to their own rows only.
- [x] Verify `resolveSalespersonSession()` is returning `roles[]` and `salespersonId` correctly for the current login.

## Supabase / RLS Policies Needed
- [x] `sales_attendance`: allow `select` for users with `admin` or `sales_manager`, and allow each salesperson to read only their own rows.
- [x] `enquiries`: allow `select` for users with `admin` or `sales_manager`, and allow each salesperson to read only their own rows.
- [x] `sales_customer_visits`: allow `select` for users with `admin` or `sales_manager`, and allow each salesperson to read only their own rows.
- [x] If using joined salesperson name lookups, allow `select` on `sales_persons` for `admin` and `sales_manager`.
- [x] Keep write policies unchanged unless team-wide edits are also required.
