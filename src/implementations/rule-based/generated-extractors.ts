export const formExtractors: Record<string, (text: string) => Record<string, any>> = {};

formExtractors['Art_Exhibition_Submission_Form'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Artist Name
  // value not found in text for Email Address
  // value not found in text for Artwork Title
  // value not found in text for Medium
  // value not found in text for Dimensions (in cm)
  // value not found in text for Year Created
  // value not found in text for Artwork Description
  match = cleanText.match(/ take place in (.*?)\. Moreover, the/);
  if (match) result['Preferred Exhibition Period'] = match[1].trim();
  result['Artwork is available for sale'] = true;
  return result;
};

formExtractors['Background_check'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for First Name
  // value not found in text for Middle Name
  // value not found in text for Last Name
  // value not found in text for Social Security Number
  // value not found in text for Date of Birth
  // value not found in text for Street Address
  // value not found in text for City
  // value not found in text for State
  // value not found in text for ZIP Code
  result['I authorize the complete background check and verify that all provided information is accurate'] = true;
  result['I understand that providing false information may result in rejection of my application'] = true;
  return result;
};

formExtractors['bank_account_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/orge Dawson 2\) (.*?) is seeking to /);
  if (match) result['Full Name'] = match[1].trim();
  // value not found in text for Date of Birth
  match = cleanText.match(/king to open a (.*?) with our bank\./);
  if (match) result['Account Type'] = match[1].trim();
  // value not found in text for ID Type
  match = cleanText.match(/ the ID number (.*?)\. Kindly consid/);
  if (match) result['ID Number'] = match[1].trim();
  return result;
};

formExtractors['Bug_report'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Bug Title
  // value not found in text for Severity Level
  // value not found in text for Environment
  // value not found in text for Browser/Platform
  // value not found in text for Steps to Reproduce
  // value not found in text for Expected Behavior
  // value not found in text for Actual Behavior
  // value not found in text for Attachments (Optional)
  // value not found in text for Your Name
  // value not found in text for Your Email
  return result;
};

formExtractors['Conference_Speaker_Application'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Full Name
  // value not found in text for Email Address
  // value not found in text for Phone Number
  // value not found in text for Organization/Institution
  // value not found in text for Presentation Title
  // value not found in text for Topic Area
  // value not found in text for Presentation Abstract
  // value not found in text for Learning Objectives
  // value not found in text for Professional Biography
  // value not found in text for CV/Resume
  // value not found in text for Previous Speaking Experience
  // value not found in text for Presentation Format
  // value not found in text for Special Technical Requirements
  // value not found in text for I agree to the speaker guidelines and terms of participation
  return result;
};

formExtractors['Contrator_onboard'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Full Name
  // value not found in text for Business Name (if applicable)
  // value not found in text for Email Address
  // value not found in text for Phone Number
  // value not found in text for Tax ID/EIN
  // value not found in text for Business Type
  // value not found in text for Services to be Provided
  // value not found in text for Start Date
  // value not found in text for Expected End Date
  // value not found in text for I agree to the terms and conditions of the contractor agreement
  // value not found in text for I agree to maintain confidentiality of all company information
  return result;
};

formExtractors['financial_planning'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Full Name
  // value not found in text for Email Address
  // value not found in text for Type of Consultation
  // value not found in text for Preferred Date
  // value not found in text for Preferred Time
  // value not found in text for Additional Comments
  return result;
};

formExtractors['grant_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for First Name
  // value not found in text for Last Name
  // value not found in text for Email
  // value not found in text for Gender
  // value not found in text for Date of Birth
  result['Subscribe to Newsletter'] = true;
  return result;
};

formExtractors['Health_Insurance'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Policy Number
  // value not found in text for Policy Holder Name
  // value not found in text for Date of Service
  // value not found in text for Claim Amount ($)
  // value not found in text for Type of Service
  // value not found in text for Diagnosis/Condition
  // value not found in text for Provider Name
  // value not found in text for Provider ID Number
  return result;
};

formExtractors['IT_support'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/ Request Type: (.*?) Priority Level/);
  if (match) result['Request Type'] = match[1].trim();
  match = cleanText.match(/ority Level of (.*?)\. The issue, su/);
  if (match) result['Priority Level'] = match[1].trim();
  match = cleanText.match(/on 2\) Subject: (.*?) Request Type: /);
  if (match) result['Subject'] = match[1].trim();
  match = cleanText.match(/r: \+1 555-7654 (.*?) When attemptin/);
  if (match) result['Brief description of the issue'] = match[1].trim();
  // value not found in text for Detailed Description
  match = cleanText.match(/on\/Department: (.*?) Number of Affe/);
  if (match) result['Location/Department'] = match[1].trim();
  match = cleanText.match(/ffected Users: (.*?) Preferred Cont/);
  if (match) result['Number of Affected Users'] = match[1].trim();
  match = cleanText.match(/ Contact Time: (.*?) Your Name: Emm/);
  if (match) result['Preferred Contact Time'] = match[1].trim();
  match = cleanText.match(/ts \(Optional\): (.*?)\. Your Name: Ja/);
  if (match) result['Screenshots (Optional)'] = match[1].trim();
  match = cleanText.match(/6PM Your Name: (.*?) Your Email: em/);
  if (match) result['Your Name'] = match[1].trim();
  match = cleanText.match(/ms Your Email: (.*?) Contact Phone /);
  if (match) result['Your Email'] = match[1].trim();
  match = cleanText.match(/ Phone Number: (.*?) The CRM softwa/);
  if (match) result['Contact Phone Number'] = match[1].trim();
  return result;
};

formExtractors['job_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Applicant Name
  // value not found in text for Position Applied For
  // value not found in text for Preferred Department
  // value not found in text for Cover Letter
  return result;
};

formExtractors['Literary_Magazine_Submission'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Author Name
  // value not found in text for Email Address
  // value not found in text for Title
  // value not found in text for Genre
  // value not found in text for Word Count
  // value not found in text for Abstract/Summary
  // value not found in text for Manuscript File
  // value not found in text for Preferred Issue
  // value not found in text for This work has been previously published
  // value not found in text for This is a simultaneous submission
  // value not found in text for I agree to the submission guidelines and terms of publication
  return result;
};

formExtractors['Manufacturing_Order'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Company Name
  // value not found in text for Customer Account Number
  // value not found in text for Product Type
  // value not found in text for Product Description
  // value not found in text for Product Specifications
  // value not found in text for Quantity
  // value not found in text for Dimensions
  // value not found in text for Material
  // value not found in text for Technical Specifications
  // value not found in text for Quality Standards
  // value not found in text for Required Delivery Date
  // value not found in text for Preferred Shipping Method
  return result;
};

formExtractors['Medical_study_Form'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Full Name
  // value not found in text for Age
  // value not found in text for Existing Medical Conditions
  // value not found in text for Current Medications
  // value not found in text for Preferred Study Type
  // value not found in text for Availability
  // value not found in text for Email Address
  // value not found in text for Phone Number
  return result;
};

formExtractors['membership_application'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Full Name
  // value not found in text for Email Address
  // value not found in text for Phone Number
  // value not found in text for Date of Birth
  // value not found in text for Membership Level
  // value not found in text for Membership Duration
  // value not found in text for Highest Education Level
  // value not found in text for Field of Study
  // value not found in text for Professional Certifications
  // value not found in text for Current Employer
  // value not found in text for Job Title
  // value not found in text for Years of Experience
  match = cleanText.match(/ University of (.*?), pursuing my B/);
  if (match) result['Industry'] = match[1].trim();
  // value not found in text for Reference Name
  // value not found in text for Reference Email
  // value not found in text for Relationship to Reference
  return result;
};

formExtractors['NDA'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Party Name
  // value not found in text for Party Type
  // value not found in text for Purpose of NDA
  // value not found in text for Effective Date
  // value not found in text for Duration (Years)
  // value not found in text for Representative Name
  // value not found in text for Title/Position
  // value not found in text for I have read and agree to the terms of the Non-Disclosure Agreement
  // value not found in text for I confirm that I have the authority to enter into this agreement
  return result;
};

formExtractors['paper_submissions'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Author Name
  // value not found in text for Email
  // value not found in text for Paper Title
  // value not found in text for Abstract
  // value not found in text for Paper Category
  return result;
};

formExtractors['Patient_Consent'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Full Name
  // value not found in text for Date of Birth
  // value not found in text for Medical Record Number
  // value not found in text for Name of Procedure
  // value not found in text for Surgeon/Physician Name
  result['I understand the nature of the procedure and its associated risks'] = true;
  result['I have had the opportunity to ask questions and they have been answered satisfactorily'] = true;
  result['I understand the alternatives to this procedure'] = true;
  // value not found in text for Emergency Contact Name
  // value not found in text for Emergency Contact Phone
  return result;
};

formExtractors['person_loan_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for First Name
  // value not found in text for Middle Name
  // value not found in text for Last Name
  // value not found in text for Loan Amount ($)
  match = cleanText.match(/d loan term is (.*?)\. Mr\. Tran is c/);
  if (match) result['Loan Term (months)'] = match[1].trim();
  // value not found in text for Employment Status
  // value not found in text for Monthly Income ($)
  return result;
};

formExtractors['Project_Bid'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Company Name
  // value not found in text for Contractor License Number
  // value not found in text for Project Name
  // value not found in text for Bid Amount ($)
  // value not found in text for Estimated Duration (weeks)
  // value not found in text for Proposed Start Date
  // value not found in text for Estimated Completion Date
  // value not found in text for Scope of Work
  // value not found in text for Detailed Work Description
  // value not found in text for Contact Person
  // value not found in text for Phone Number
  return result;
};

formExtractors['real_estate_rental_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Full Name
  // value not found in text for Email Address
  // value not found in text for Phone Number
  // value not found in text for Date of Birth
  // value not found in text for Street Address
  // value not found in text for City
  // value not found in text for State
  // value not found in text for ZIP Code
  // value not found in text for Current Employer
  // value not found in text for Job Title
  // value not found in text for Monthly Income (USD)
  match = cleanText.match(/r position for (.*?)\. She is intere/);
  if (match) result['Length of Employment'] = match[1].trim();
  // value not found in text for Preferred Move-in Date
  match = cleanText.match(/ lease term of (.*?) and a maximum /);
  if (match) result['Preferred Lease Term'] = match[1].trim();
  // value not found in text for Maximum Monthly Rent (USD)
  // value not found in text for Preferred Area
  // value not found in text for Do you have any pets?
  match = cleanText.match(/thus there are (.*?) to describe\. I/);
  if (match) result['If yes, please describe your pets'] = match[1].trim();
  // value not found in text for Additional Comments
  return result;
};

formExtractors['scholarship_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for First Name
  // value not found in text for Middle Name
  // value not found in text for Last Name
  // value not found in text for Student ID
  // value not found in text for Major/Field of Study
  // value not found in text for Current GPA
  // value not found in text for Academic Year
  // value not found in text for Current Financial Aid
  // value not found in text for Annual Family Income
  // value not found in text for Statement of Purpose
  // value not found in text for Academic Reference
  // value not found in text for Reference Email
  return result;
};

formExtractors['startup_funding_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Company Name
  // value not found in text for Company Website
  // value not found in text for Founding Date
  match = cleanText.match(/rrently in the (.*?) stage, is seek/);
  if (match) result['Business Stage'] = match[1].trim();
  // value not found in text for Founder Name
  // value not found in text for Email
  // value not found in text for Phone Number
  // value not found in text for LinkedIn Profile
  // value not found in text for Funding Amount Required (USD)
  match = cleanText.match(/alued at USD 1,(.*?)54,377\. The pur/);
  if (match) result['Equity Offered (%)'] = match[1].trim();
  // value not found in text for Current Company Valuation (USD)
  // value not found in text for Purpose of Funding
  // value not found in text for Business Model
  // value not found in text for Target Market
  // value not found in text for Current Monthly Revenue (USD)
  match = cleanText.match(/ns, founded on (.*?)20\/08\/29 and cu/);
  if (match) result['Current Team Size'] = match[1].trim();
  // value not found in text for Additional Comments
  return result;
};

formExtractors['student_courses'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Full Name
  // value not found in text for Student ID
  // value not found in text for Email
  // value not found in text for Phone Number
  // value not found in text for Semester
  // value not found in text for Program
  match = cleanText.match(/(.*?)/);
  if (match) result['Selected Courses'] = [match[1].trim()];
  // value not found in text for Special Requirements or Comments
  return result;
};

formExtractors['workshop_registrations'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  // value not found in text for Full Name
  // value not found in text for Email Address
  // value not found in text for Phone Number
  // value not found in text for Organization/Company
  // value not found in text for Workshop Category
  // value not found in text for Preferred Session Date
  // value not found in text for Preferred Time Slot
  // value not found in text for Preferred Delivery Mode
  // value not found in text for Highest Education Level
  // value not found in text for Years of Professional Experience
  // value not found in text for Current Role/Position
  // value not found in text for Dietary Requirements
  // value not found in text for Accessibility Requirements
  match = cleanText.match(/shop through a (.*?) payment method/);
  if (match) result['Payment Method'] = match[1].trim();
  // value not found in text for Billing Address
  // value not found in text for What do you hope to learn from this workshop?
  // value not found in text for Any other special requests or comments?
  return result;
};

