



# TASK.md (Checklist)

## Enquiry Module UI/DB Updates (ONLY items in this TASK.md)

### 1) Enquiry No in UI + Persist to DB
- [ ] Show **Enquiry no** in enquiry UI (currently not displayed).
- [ ] Persist generated **enquiry_no** (example: `ENQ-00001`) into `enquiries.enquiry_no` column.

### 2) Mode selection UI (from `mode_master`)
- [ ] Add **Mode** selection field to the enquiry form using `mode_master`.
- [ ] Mode options must come from `mode_master(id, mode_name, mode_code)`.
- [ ] Store the selected mode id into `enquiries.mode_id`.

Expected option shape:
- `id, mode_name, mode_code`
- Air Export → `AE`
- Air Import → `AI`
- Courier Export → `CE`
- Courier Import → `CI`
- Ex-Bond → `EB`
- Sea FCL Export → `SFE`
- Sea FCL Import → `SFI`
- Sea LCL Export → `SLE`
- Sea LCL Import → `SLI`

UI pattern reference (select/buttons style):
- Uses `MODE_OPTIONS.map((m) => m.label)`
- Uses `form.mode_id` to set selected label
- On select, sets `mode_id` to `found.id.toString()`

### 3) Customer dropdown using `customer_master` (+ add new)
- [ ] Use `customer_master` table to populate an **Existing customers** dropdown.
- [ ] Add an option/button to **add new customer** (which should then be usable in the enquiry form).
- [ ] Store chosen customer id into `enquiries.customer_id`.

### 4) Remove quotation section completely
- [ ] Remove any quotation-related UI section from the enquiry flow.

---

(Original requirement text)

So enquiry should show Enquiry no. in ui which it is not showing currently , also i want it to store enquiry_no (ENQ-00001) in enquiries table having enquiry_no column , Add mode seletion on UI like the below thing 
id,mode_name,mode_code
2,Air Export,AE
1,Air Import,AI
8,Courier Export,CE
7,Courier Import,CI
9,Ex-Bond,EB
6,Sea FCL Export,SFE
4,Sea FCL Import,SFI
5,Sea LCL Export,SLE
3,Sea LCL Import,SLI

<FieldLabel required>Mode</FieldLabel>

              <SelectButtons

                options={MODE_OPTIONS.map((m) => m.label)}

                value={MODE_OPTIONS.find((m) => m.id.toString() === form.mode_id)?.label ?? ''}

                onChange={(label) => {

                  const found = MODE_OPTIONS.find((m) => m.label === label);

                  if (found) set('mode_id')(found.id.toString());

                }}

Refer only existing_schema table  completely 

Also i want you to use the customer_mster table to show a dropdown for the Existing coustomers along with an option to add new customer 

Remove qoutation section completely
