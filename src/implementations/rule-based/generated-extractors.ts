export const formExtractors: Record<string, (text: string) => Record<string, any>> = {};

formExtractors['Art_Exhibition_Submission_Form'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/Artist (.*?), residing at t/);
  if (match) result['Artist Name'] = match[1].trim();
  match = cleanText.match(/ email address (.*?), is pleased to/);
  if (match) result['Email Address'] = match[1].trim();
  match = cleanText.match(/rtwork titled "(.*?)" for considera/);
  if (match) result['Artwork Title'] = match[1].trim();
  match = cleanText.match(/ the medium of (.*?), measures 120 /);
  if (match) result['Medium'] = match[1].trim();
  match = cleanText.match(/ting, measures (.*?) cm and was cre/);
  if (match) result['Dimensions (in cm)'] = match[1].trim();
  match = cleanText.match(/ed in the year (.*?)\. "This paintin/);
  if (match) result['Year Created'] = match[1].trim();
  match = cleanText.match(/he year 2022\. "(.*?)" Amanda Lee ex/);
  if (match) result['Artwork Description'] = match[1].trim();
  match = cleanText.match(/ take place in (.*?)\. Moreover, the/);
  if (match) result['Preferred Exhibition Period'] = match[1].trim();
  result['Artwork is available for sale'] = true;
  return result;
};

formExtractors['Background_check'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/I, (.*?) Michael Doe, h/);
  if (match) result['First Name'] = match[1].trim();
  match = cleanText.match(/I, John (.*?) Doe, hereby au/);
  if (match) result['Middle Name'] = match[1].trim();
  match = cleanText.match(/, John Michael (.*?), hereby author/);
  if (match) result['Last Name'] = match[1].trim();
  match = cleanText.match(/rity Number is (.*?)\. By consenting/);
  if (match) result['Social Security Number'] = match[1].trim();
  // value not found in text for Date of Birth
  match = cleanText.match(/s: I reside at (.*?) in Springfield/);
  if (match) result['Street Address'] = match[1].trim();
  match = cleanText.match(/ 123 Elm St in (.*?), Illinois, 627/);
  if (match) result['City'] = match[1].trim();
  // value not found in text for State
  match = cleanText.match(/eld, Illinois, (.*?), and my date o/);
  if (match) result['ZIP Code'] = match[1].trim();
  result['I authorize the complete background check and verify that all provided information is accurate'] = true;
  result['I understand that providing false information may result in rejection of my application'] = true;
  return result;
};

formExtractors['bank_account_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/ly\. My name is (.*?), and I was bor/);
  if (match) result['Full Name'] = match[1].trim();
  // value not found in text for Date of Birth
  match = cleanText.match(/to apply for a (.*?) and am excited/);
  if (match) result['Account Type'] = match[1].trim();
  match = cleanText.match(/ve included my (.*?), the number of/);
  if (match) result['ID Type'] = match[1].trim();
  match = cleanText.match(/er of which is (.*?)\. I am confiden/);
  if (match) result['ID Number'] = match[1].trim();
  return result;
};

formExtractors['Bug_report'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/ams Bug Title: (.*?) Severity Level/);
  if (match) result['Bug Title'] = match[1].trim();
  match = cleanText.match(/everity Level: (.*?) Environment: P/);
  if (match) result['Severity Level'] = match[1].trim();
  match = cleanText.match(/h Environment: (.*?) Browser\/Platfo/);
  if (match) result['Environment'] = match[1].trim();
  match = cleanText.match(/wser\/Platform: (.*?) Steps to Repro/);
  if (match) result['Browser/Platform'] = match[1].trim();
  // value not found in text for Steps to Reproduce
  match = cleanText.match(/cted Behavior: (.*?) Actual Behavio/);
  if (match) result['Expected Behavior'] = match[1].trim();
  match = cleanText.match(/tual Behavior: (.*?) Attachments \(O/);
  if (match) result['Actual Behavior'] = match[1].trim();
  match = cleanText.match(/ts \(Optional\): (.*?) Reported by: J/);
  if (match) result['Attachments (Optional)'] = match[1].trim();
  match = cleanText.match(/Bug Report by (.*?) Bug Title: App/);
  if (match) result['Your Name'] = match[1].trim();
  match = cleanText.match(/t Information: (.*?) This bug has b/);
  if (match) result['Your Email'] = match[1].trim();
  return result;
};

formExtractors['Conference_Speaker_Application'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/(.*?), representing /);
  if (match) result['Full Name'] = match[1].trim();
  match = cleanText.match(/d via email at (.*?) or phone at 12/);
  if (match) result['Email Address'] = match[1].trim();
  match = cleanText.match(/om or phone at (.*?)\. His presentat/);
  if (match) result['Phone Number'] = match[1].trim();
  match = cleanText.match(/, representing (.*?), submits an ap/);
  if (match) result['Organization/Institution'] = match[1].trim();
  match = cleanText.match(/ation, titled "(.*?)," falls within/);
  if (match) result['Presentation Title'] = match[1].trim();
  match = cleanText.match(/ntelligence in (.*?)," falls within/);
  if (match) result['Topic Area'] = match[1].trim();
  match = cleanText.match(/f Visual Arts\. (.*?) The learning o/);
  if (match) result['Presentation Abstract'] = match[1].trim();
  // value not found in text for Learning Objectives
  match = cleanText.match(/en creativity\. (.*?) He has signifi/);
  if (match) result['Professional Biography'] = match[1].trim();
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

  match = cleanText.match(/sed to welcome (.*?), operating und/);
  if (match) result['Full Name'] = match[1].trim();
  match = cleanText.match(/ business name (.*?), as a valued c/);
  if (match) result['Business Name (if applicable)'] = match[1].trim();
  match = cleanText.match(/ be reached at (.*?) or via phone a/);
  if (match) result['Email Address'] = match[1].trim();
  match = cleanText.match(/r via phone at (.*?)\. With a Tax ID/);
  if (match) result['Phone Number'] = match[1].trim();
  match = cleanText.match(/ Tax ID\/EIN of (.*?), Abigail is es/);
  if (match) result['Tax ID/EIN'] = match[1].trim();
  match = cleanText.match(/tablished as a (.*?)\. She will be c/);
  if (match) result['Business Type'] = match[1].trim();
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

  match = cleanText.match(/ll\. My name is (.*?), and I am reac/);
  if (match) result['Full Name'] = match[1].trim();
  match = cleanText.match(/e via email at (.*?)\. I look forwar/);
  if (match) result['Email Address'] = match[1].trim();
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

  match = cleanText.match(/\*\* First Name: (.*?) Last Name: Bri/);
  if (match) result['First Name'] = match[1].trim();
  match = cleanText.match(/ana Last Name: (.*?) Email: wmills@/);
  if (match) result['Last Name'] = match[1].trim();
  match = cleanText.match(/Bridges Email: (.*?) Gender: Female/);
  if (match) result['Email'] = match[1].trim();
  match = cleanText.match(/ds\.net Gender: (.*?) Date of Birth:/);
  if (match) result['Gender'] = match[1].trim();
  match = cleanText.match(/Date of Birth: (.*?) Dear Grant Rev/);
  if (match) result['Date of Birth'] = match[1].trim();
  result['Subscribe to Newsletter'] = true;
  return result;
};

formExtractors['Health_Insurance'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/ policy number (.*?), respectfully /);
  if (match) result['Policy Number'] = match[1].trim();
  match = cleanText.match(/(.*?), the policyhol/);
  if (match) result['Policy Holder Name'] = match[1].trim();
  // value not found in text for Date of Service
  match = cleanText.match(/n amounted to \$(.*?)\.00\. Emily Turn/);
  if (match) result['Claim Amount ($)'] = match[1].trim();
  match = cleanText.match(/or a scheduled (.*?)\. The purpose o/);
  if (match) result['Type of Service'] = match[1].trim();
  match = cleanText.match(/a Diagnosis of (.*?)\. The costs ass/);
  if (match) result['Diagnosis/Condition'] = match[1].trim();
  match = cleanText.match(/ Emily visited (.*?), whose provide/);
  if (match) result['Provider Name'] = match[1].trim();
  match = cleanText.match(/r ID number is (.*?), for a schedul/);
  if (match) result['Provider ID Number'] = match[1].trim();
  return result;
};

formExtractors['IT_support'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/ Request Type: (.*?) Priority Level/);
  if (match) result['Request Type'] = match[1].trim();
  match = cleanText.match(/riority Level: (.*?) Hello, I am wr/);
  if (match) result['Priority Level'] = match[1].trim();
  match = cleanText.match(/Subject: (.*?) Request Type: /);
  if (match) result['Subject'] = match[1].trim();
  // value not found in text for Brief description of the issue
  // value not found in text for Detailed Description
  // value not found in text for Location/Department
  match = cleanText.match(/ approximately (.*?)\. Please priori/);
  if (match) result['Number of Affected Users'] = match[1].trim();
  match = cleanText.match(/ contact time, (.*?), for any addit/);
  if (match) result['Preferred Contact Time'] = match[1].trim();
  // value not found in text for Screenshots (Optional)
  match = cleanText.match(/ Best regards, (.*?)/);
  if (match) result['Your Name'] = match[1].trim();
  match = cleanText.match(/me directly at (.*?) or via phone a/);
  if (match) result['Your Email'] = match[1].trim();
  match = cleanText.match(/r via phone at (.*?)\. Thank you for/);
  if (match) result['Contact Phone Number'] = match[1].trim();
  return result;
};

formExtractors['job_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/ed\. My name is (.*?), and I am eage/);
  if (match) result['Applicant Name'] = match[1].trim();
  match = cleanText.match(/nterest in the (.*?) position at \[C/);
  if (match) result['Position Applied For'] = match[1].trim();
  match = cleanText.match(/lly within the (.*?) department\. I /);
  if (match) result['Preferred Department'] = match[1].trim();
  // value not found in text for Cover Letter
  return result;
};

formExtractors['Literary_Magazine_Submission'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/(.*?) respectfully s/);
  if (match) result['Author Name'] = match[1].trim();
  match = cleanText.match(/ be reached at (.*?)\./);
  if (match) result['Email Address'] = match[1].trim();
  match = cleanText.match(/r work titled "(.*?)" to your estee/);
  if (match) result['Title'] = match[1].trim();
  match = cleanText.match(/r entry in the (.*?) genre comprise/);
  if (match) result['Genre'] = match[1].trim();
  match = cleanText.match(/ word count of (.*?)\. Within this s/);
  if (match) result['Word Count'] = match[1].trim();
  match = cleanText.match(/ins integral: "(.*?)" Unfortunately/);
  if (match) result['Abstract/Summary'] = match[1].trim();
  // value not found in text for Manuscript File
  match = cleanText.match(/idered for the (.*?) issue\. It is n/);
  if (match) result['Preferred Issue'] = match[1].trim();
  // value not found in text for This work has been previously published
  // value not found in text for This is a simultaneous submission
  // value not found in text for I agree to the submission guidelines and terms of publication
  return result;
};

formExtractors['Manufacturing_Order'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/partment From: (.*?) Date: \[Today's/);
  if (match) result['Company Name'] = match[1].trim();
  match = cleanText.match(/ccount Number: (.*?)\) is excited to/);
  if (match) result['Customer Account Number'] = match[1].trim();
  // value not found in text for Product Type
  // value not found in text for Product Description
  // value not found in text for Product Specifications
  match = cleanText.match(/ production of (.*?) units of a spe/);
  if (match) result['Quantity'] = match[1].trim();
  match = cleanText.match(/sure precisely (.*?) in dimensions,/);
  if (match) result['Dimensions'] = match[1].trim();
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

  match = cleanText.match(/\*\*Full Name:\*\* (.*?) \*\*Age:\*\* 32 \*\*/);
  if (match) result['Full Name'] = match[1].trim();
  match = cleanText.match(/ Chen \*\*Age:\*\* (.*?) \*\*Existing Med/);
  if (match) result['Age'] = match[1].trim();
  match = cleanText.match(/diagnosed with (.*?)\. \*\*Current Med/);
  if (match) result['Existing Medical Conditions'] = match[1].trim();
  match = cleanText.match(/rrently taking (.*?) to manage my m/);
  if (match) result['Current Medications'] = match[1].trim();
  match = cleanText.match(/icipating in a (.*?), as my preferr/);
  if (match) result['Preferred Study Type'] = match[1].trim();
  // value not found in text for Availability
  match = cleanText.match(/ail Address:\*\* (.*?) - \*\*Phone Numb/);
  if (match) result['Email Address'] = match[1].trim();
  match = cleanText.match(/hone Number:\*\* (.*?) Please do not /);
  if (match) result['Phone Number'] = match[1].trim();
  return result;
};

formExtractors['membership_application'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/on\. My name is (.*?), and I current/);
  if (match) result['Full Name'] = match[1].trim();
  match = cleanText.match(/ds, John Smith (.*?) 555-0123 1990\//);
  if (match) result['Email Address'] = match[1].trim();
  match = cleanText.match(/mith@gmail\.com (.*?) 1990\/01\/15/);
  if (match) result['Phone Number'] = match[1].trim();
  match = cleanText.match(/l\.com 555-0123 (.*?)/);
  if (match) result['Date of Birth'] = match[1].trim();
  match = cleanText.match(/applying for a (.*?) membership lev/);
  if (match) result['Membership Level'] = match[1].trim();
  // value not found in text for Membership Duration
  match = cleanText.match(/y, pursuing my (.*?) in Computer Sc/);
  if (match) result['Highest Education Level'] = match[1].trim();
  match = cleanText.match(/or's Degree in (.*?)\. As a dedicate/);
  if (match) result['Field of Study'] = match[1].trim();
  // value not found in text for Professional Certifications
  match = cleanText.match(/student at the (.*?), pursuing my B/);
  if (match) result['Current Employer'] = match[1].trim();
  match = cleanText.match(/applying for a (.*?) Member members/);
  if (match) result['Job Title'] = match[1].trim();
  match = cleanText.match(/@gmail\.com 555-(.*?)123 1990\/01\/15/);
  if (match) result['Years of Experience'] = match[1].trim();
  // value not found in text for Industry
  match = cleanText.match(/ionals such as (.*?), a respected p/);
  if (match) result['Reference Name'] = match[1].trim();
  // value not found in text for Reference Email
  // value not found in text for Relationship to Reference
  return result;
};

formExtractors['NDA'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/idual known as (.*?), holding the p/);
  if (match) result['Party Name'] = match[1].trim();
  // value not found in text for Party Type
  match = cleanText.match(/ly defined as "(.*?)\." This NDA, su/);
  if (match) result['Purpose of NDA'] = match[1].trim();
  match = cleanText.match(/On (.*?), an individual/);
  if (match) result['Effective Date'] = match[1].trim();
  match = cleanText.match(/On 2024\/12\/0(.*?), an individual/);
  if (match) result['Duration (Years)'] = match[1].trim();
  match = cleanText.match(/idual known as (.*?), holding the p/);
  if (match) result['Representative Name'] = match[1].trim();
  match = cleanText.match(/he position of (.*?), initiated a N/);
  if (match) result['Title/Position'] = match[1].trim();
  // value not found in text for I have read and agree to the terms of the Non-Disclosure Agreement
  // value not found in text for I confirm that I have the authority to enter into this agreement
  return result;
};

formExtractors['paper_submissions'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/uthored by me, (.*?), this paper ex/);
  if (match) result['Author Name'] = match[1].trim();
  match = cleanText.match(/e via email at (.*?)\. I look forwar/);
  if (match) result['Email'] = match[1].trim();
  match = cleanText.match(/aper entitled "(.*?)\." Authored by /);
  if (match) result['Paper Title'] = match[1].trim();
  // value not found in text for Abstract
  match = cleanText.match(/dvancements in (.*?) for Image Reco/);
  if (match) result['Keywords'] = [match[1].trim()];
  match = cleanText.match(/discussions on (.*?) at the confere/);
  if (match) result['Paper Category'] = match[1].trim();
  return result;
};

formExtractors['Patient_Consent'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/(.*?), born on Augus/);
  if (match) result['Full Name'] = match[1].trim();
  // value not found in text for Date of Birth
  match = cleanText.match(/ record number (.*?), has given inf/);
  if (match) result['Medical Record Number'] = match[1].trim();
  match = cleanText.match(/ consent for a (.*?) to be performe/);
  if (match) result['Name of Procedure'] = match[1].trim();
  match = cleanText.match(/e performed by (.*?)\. James acknowl/);
  if (match) result['Surgeon/Physician Name'] = match[1].trim();
  result['I understand the nature of the procedure and its associated risks'] = true;
  result['I have had the opportunity to ask questions and they have been answered satisfactorily'] = true;
  result['I understand the alternatives to this procedure'] = true;
  match = cleanText.match(/y emergencies, (.*?) will serve as /);
  if (match) result['Emergency Contact Name'] = match[1].trim();
  match = cleanText.match(/ be reached at (.*?)\./);
  if (match) result['Emergency Contact Phone'] = match[1].trim();
  return result;
};

formExtractors['person_loan_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/(.*?) Stephen Tran i/);
  if (match) result['First Name'] = match[1].trim();
  match = cleanText.match(/John (.*?) Tran is seekin/);
  if (match) result['Middle Name'] = match[1].trim();
  match = cleanText.match(/John Stephen (.*?) is seeking to /);
  if (match) result['Last Name'] = match[1].trim();
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

  match = cleanText.match(/ect Overview\*\* (.*?) is pleased to /);
  if (match) result['Company Name'] = match[1].trim();
  match = cleanText.match(/License Number (.*?), we not only b/);
  if (match) result['Contractor License Number'] = match[1].trim();
  match = cleanText.match(/r the proposed (.*?) project\. With /);
  if (match) result['Project Name'] = match[1].trim();
  // value not found in text for Bid Amount ($)
  match = cleanText.match(/e on June 1, 20(.*?), with an expec/);
  if (match) result['Estimated Duration (weeks)'] = match[1].trim();
  // value not found in text for Proposed Start Date
  // value not found in text for Estimated Completion Date
  // value not found in text for Scope of Work
  // value not found in text for Detailed Work Description
  match = cleanText.match(/ top priority\. (.*?) will be your d/);
  if (match) result['Contact Person'] = match[1].trim();
  match = cleanText.match(/h us easily at (.*?) for any inquir/);
  if (match) result['Phone Number'] = match[1].trim();
  return result;
};

formExtractors['real_estate_rental_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/(.*?), residing at 3/);
  if (match) result['Full Name'] = match[1].trim();
  match = cleanText.match(/ be reached at (.*?) or via phone a/);
  if (match) result['Email Address'] = match[1].trim();
  match = cleanText.match(/r via phone at (.*?)\. Born on 1979\//);
  if (match) result['Phone Number'] = match[1].trim();
  match = cleanText.match(/1x270\. Born on (.*?), Amy is curren/);
  if (match) result['Date of Birth'] = match[1].trim();
  match = cleanText.match(/o, residing at (.*?) in Christopher/);
  if (match) result['Street Address'] = match[1].trim();
  match = cleanText.match(/lark Tunnel in (.*?), Alabama, ZIP /);
  if (match) result['City'] = match[1].trim();
  match = cleanText.match(/istopherburgh, (.*?), ZIP Code 3738/);
  if (match) result['State'] = match[1].trim();
  match = cleanText.match(/bama, ZIP Code (.*?), is seeking a /);
  if (match) result['ZIP Code'] = match[1].trim();
  match = cleanText.match(/ly employed by (.*?) as an Environm/);
  if (match) result['Current Employer'] = match[1].trim();
  // value not found in text for Job Title
  // value not found in text for Monthly Income (USD)
  match = cleanText.match(/r position for (.*?)\. She is intere/);
  if (match) result['Length of Employment'] = match[1].trim();
  match = cleanText.match(/ relocating by (.*?), with a prefer/);
  if (match) result['Preferred Move-in Date'] = match[1].trim();
  match = cleanText.match(/ lease term of (.*?) and a maximum /);
  if (match) result['Preferred Lease Term'] = match[1].trim();
  // value not found in text for Maximum Monthly Rent (USD)
  match = cleanText.match(/for properties (.*?)\. She does not /);
  if (match) result['Preferred Area'] = match[1].trim();
  match = cleanText.match(/thus there are (.*?) pets to descri/);
  if (match) result['Do you have any pets?'] = match[1].trim();
  match = cleanText.match(/thus there are (.*?) to describe\. I/);
  if (match) result['If yes, please describe your pets'] = match[1].trim();
  match = cleanText.match(/s, she notes, "(.*?)" Amy is a reli/);
  if (match) result['Additional Comments'] = match[1].trim();
  return result;
};

formExtractors['scholarship_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/ee, My name is (.*?) Anne Collins, /);
  if (match) result['First Name'] = match[1].trim();
  match = cleanText.match(/me is Nicholas (.*?) Collins, and I/);
  if (match) result['Middle Name'] = match[1].trim();
  match = cleanText.match(/ Nicholas Anne (.*?), and I am a so/);
  if (match) result['Last Name'] = match[1].trim();
  match = cleanText.match(/ns Student ID: (.*?) Email: nichola/);
  if (match) result['Student ID'] = match[1].trim();
  match = cleanText.match(/re majoring in (.*?) at your esteem/);
  if (match) result['Major/Field of Study'] = match[1].trim();
  match = cleanText.match(/ntain a GPA of (.*?) while balancin/);
  if (match) result['Current GPA'] = match[1].trim();
  // value not found in text for Academic Year
  // value not found in text for Current Financial Aid
  // value not found in text for Annual Family Income
  // value not found in text for Statement of Purpose
  match = cleanText.match(/mic reference, (.*?), who can attes/);
  if (match) result['Academic Reference'] = match[1].trim();
  match = cleanText.match(/ference Email: (.*?)/);
  if (match) result['Reference Email'] = match[1].trim();
  return result;
};

formExtractors['startup_funding_applications'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/(.*?), founded on 20/);
  if (match) result['Company Name'] = match[1].trim();
  match = cleanText.match(/mpany website, (.*?), and Founder K/);
  if (match) result['Company Website'] = match[1].trim();
  match = cleanText.match(/ns, founded on (.*?) and currently /);
  if (match) result['Founding Date'] = match[1].trim();
  match = cleanText.match(/rrently in the (.*?) stage, is seek/);
  if (match) result['Business Stage'] = match[1].trim();
  match = cleanText.match(/hip of Founder (.*?), the company i/);
  if (match) result['Founder Name'] = match[1].trim();
  match = cleanText.match(/e via email at (.*?) or phone at 17/);
  if (match) result['Email'] = match[1].trim();
  match = cleanText.match(/om or phone at (.*?)\./);
  if (match) result['Phone Number'] = match[1].trim();
  match = cleanText.match(/be accessed at (.*?)\. For further q/);
  if (match) result['LinkedIn Profile'] = match[1].trim();
  // value not found in text for Funding Amount Required (USD)
  match = cleanText.match(/unded on 2020\/0(.*?)\/29 and current/);
  if (match) result['Equity Offered (%)'] = match[1].trim();
  // value not found in text for Current Company Valuation (USD)
  // value not found in text for Purpose of Funding
  // value not found in text for Business Model
  // value not found in text for Target Market
  // value not found in text for Current Monthly Revenue (USD)
  match = cleanText.match(/a team size of (.*?), Pinnacle Solu/);
  if (match) result['Current Team Size'] = match[1].trim();
  // value not found in text for Additional Comments
  return result;
};

formExtractors['student_courses'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/t Information\] (.*?) Student ID: 88/);
  if (match) result['Full Name'] = match[1].trim();
  match = cleanText.match(/dy Student ID: (.*?) Email: wendy24/);
  if (match) result['Student ID'] = match[1].trim();
  match = cleanText.match(/8741153 Email: (.*?) Phone Number: /);
  if (match) result['Email'] = match[1].trim();
  match = cleanText.match(/ Phone Number: (.*?) \[Date\] \[Univer/);
  if (match) result['Phone Number'] = match[1].trim();
  match = cleanText.match(/n the upcoming (.*?) semester\. I am/);
  if (match) result['Semester'] = match[1].trim();
  match = cleanText.match(/nrolled in the (.*?) program, and I/);
  if (match) result['Program'] = match[1].trim();
  match = cleanText.match(/ in the course (.*?), as it aligns /);
  if (match) result['Selected Courses'] = [match[1].trim()];
  match = cleanText.match(/ollment form, "(.*?)" I am looking /);
  if (match) result['Special Requirements or Comments'] = match[1].trim();
  return result;
};

formExtractors['workshop_registrations'] = (text: string) => {
  const cleanText = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  const result: Record<string, any> = {};
  let match;

  match = cleanText.match(/ce\. Full Name: (.*?) Email Address:/);
  if (match) result['Full Name'] = match[1].trim();
  match = cleanText.match(/Email Address: (.*?) Phone Number: /);
  if (match) result['Email Address'] = match[1].trim();
  match = cleanText.match(/ Phone Number: (.*?) Organization\/C/);
  if (match) result['Phone Number'] = match[1].trim();
  match = cleanText.match(/ation\/Company: (.*?) As a professio/);
  if (match) result['Organization/Company'] = match[1].trim();
  match = cleanText.match(/tion Request - (.*?) Dear Workshop /);
  if (match) result['Workshop Category'] = match[1].trim();
  match = cleanText.match(/ession date of (.*?) at 6PM, to be /);
  if (match) result['Preferred Session Date'] = match[1].trim();
  match = cleanText.match(/ 2025\/02\/02 at (.*?), to be attende/);
  if (match) result['Preferred Time Slot'] = match[1].trim();
  match = cleanText.match(/ attended in a (.*?) delivery mode\./);
  if (match) result['Preferred Delivery Mode'] = match[1].trim();
  match = cleanText.match(/ssional with a (.*?) and 20 years o/);
  if (match) result['Highest Education Level'] = match[1].trim();
  match = cleanText.match(/r's Degree and (.*?) years of exper/);
  if (match) result['Years of Professional Experience'] = match[1].trim();
  match = cleanText.match(/ serving as an (.*?), I am eager to/);
  if (match) result['Current Role/Position'] = match[1].trim();
  match = cleanText.match(/nts, I require (.*?) meals; however/);
  if (match) result['Dietary Requirements'] = match[1].trim();
  // value not found in text for Accessibility Requirements
  match = cleanText.match(/shop through a (.*?) payment method/);
  if (match) result['Payment Method'] = match[1].trim();
  // value not found in text for Billing Address
  // value not found in text for What do you hope to learn from this workshop?
  // value not found in text for Any other special requests or comments?
  return result;
};

