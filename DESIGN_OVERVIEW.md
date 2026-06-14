# Logistics Management System - Design Overview

## UI Design Principles

The UI follows a modern enterprise dashboard design with a dark blue gradient header, providing a professional logistics-oriented appearance. Information is organized into card-based sections for better readability and quick access. The system uses color-coded badges (e.g., Pending, Air Export) to visually represent enquiry status and shipment mode. Action buttons such as Edit, Export Excel, Print, Confirm, and Back are prominently placed for easy workflow execution.

## Enquiries List Page

### Purpose
Displays all customer enquiries in a tabular format, allowing users to:
- Search and filter enquiries
- View enquiry details
- Edit or update records
- Confirm or cancel enquiries
- Export enquiry data to Excel
- Print enquiry documents
- Link enquiries to jobs for further processing

### Key Features
1. **Search and Filtering**
   - Search bar for finding enquiries by customer name, enquiry number, or commodity
   - Advanced filtering options (not yet implemented)

2. **Card-Based Layout**
   - Each enquiry is displayed in a card with key information
   - Color-coded status badges for quick visual identification
   - Clear presentation of shipment routes (POL → POD)

3. **Action Buttons**
   - **View**: See detailed enquiry information
   - **Edit**: Modify enquiry details
   - **Job**: Link enquiry to a job for processing

4. **Bulk Actions**
   - Export to Excel
   - Print selected enquiries

5. **Responsive Design**
   - Adapts to both web and mobile platforms
   - Optimized touch targets for mobile users

## Enquiry Detail Page

### Purpose
Provides a complete overview of a specific enquiry, dividing information into structured sections for comprehensive review.

### Information Sections

#### 1. Enquiry Information
- Enquiry date
- Customer details (name, address, GST)
- Sales person information
- Current status with visual indicator

#### 2. Shipment Details
- Mode of transport (Sea/Air Export/Import)
- Port of Loading (POL) with country information
- Port of Destination (POD) with country information

#### 3. Cargo Details
- Commodity description
- Package count and unit type
- Gross weight and unit
- Cubic Meter (CBM) measurement

#### 4. Shipper & Consignee
- Separate sections for shipper and consignee information

#### 5. Exchange Rates
- USD, EUR, and GBP exchange rates for pricing calculations

#### 6. Linked Job Information
- Reference to associated job if enquiry has been converted

### Action Buttons
- **Edit**: Modify enquiry details
- **Print**: Generate printable document
- **Confirm**: Mark enquiry as confirmed
- **Cancel**: Cancel the enquiry
- **Create Job**: Convert enquiry to a job for processing

## Data Structure

The system uses the `enquiries` table in the Supabase database with the following key fields:

### Core Fields
- `id`: Unique identifier
- `enquiry_no`: Enquiry number (auto-generated if not provided)
- `enq_date`: Date of enquiry
- `status`: Current status (Pending, Confirmed, Cancelled, etc.)

### Customer Information
- `customer_id`: Reference to customer in customer_master table
- `customer_name`: Customer name
- `customer_address`: Customer address
- `customer_gst`: Customer GST number

### Shipment Information
- `mode_id`: Transport mode reference
- `pol_country`: Port of Loading country
- `pol`: Port of Loading
- `pod_country`: Port of Destination country
- `pod`: Port of Destination

### Cargo Information
- `commodity`: Description of goods
- `packages`: Number of packages
- `packages_unit`: Unit of measurement for packages
- `gross_weight`: Total weight
- `gross_weight_unit`: Unit of weight measurement
- `cbm`: Cubic meter volume

### Financial Information
- `usd_exchange_rate`: USD exchange rate
- `eur_exchange_rate`: EUR exchange rate
- `gbp_exchange_rate`: GBP exchange rate

### Relationship Fields
- `sales_person_id`: Reference to sales person
- `shipper_id`: Reference to shipper in shipper_master table
- `cnee_id`: Reference to consignee in consignee_master table
- `job_id`: Reference to associated job if created

## Security and Access Control

- Sales persons can only view enquiries assigned to them
- Admin users can view all enquiries
- Authentication required for all operations
- Role-based access control for sensitive actions

## Future Enhancements

1. **Advanced Filtering**
   - Date range filters
   - Status-based filtering
   - Customer-specific filtering

2. **Quotation Lines**
   - Pricing information display
   - Currency conversion
   - Total amount calculations

3. **Bulk Operations**
   - Multi-select for bulk actions
   - Batch status updates

4. **Reporting**
   - Enquiry statistics
   - Sales performance metrics
   - Trend analysis

5. **Notifications**
   - Enquiry status change alerts
   - Follow-up reminders
   - Automated notifications