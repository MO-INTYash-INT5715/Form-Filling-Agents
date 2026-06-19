/**
 * Rule-Based Portal Agent
 *
 * Keyword matching strategy — fastest, fully offline, no API keys required.
 * Mirrors the extension's rule-based agent but adapted for server-side use.
 * Keyword map expanded to cover all 25 FormFactory form field names.
 */

import type { ScrapedForm, ScrapedField } from '../types/index';
import type { PortalAgent, FieldFill, FieldFillResult, FlatProfile } from './types';

// ── Keyword → profile key mappings ───────────────────────────────────────────
// Key: lowercase substring to match in field label/name/placeholder/id
// Value: FlatProfile key (dot-path, lowercased)

const KEYWORD_MAP: Record<string, string> = {
  // Personal identity
  'full name':         'personal.fullname',
  'applicant name':    'personal.fullname',
  'policy holder':     'personal.fullname',
  'your name':         'personal.fullname',
  'first name':        'personal.firstname',
  'given name':        'personal.firstname',
  'middle name':       'personal.middlename',
  'last name':         'personal.lastname',
  'surname':           'personal.lastname',
  'family name':       'personal.lastname',
  'email':             'personal.email',
  'e-mail':            'personal.email',
  'phone':             'personal.phone',
  'telephone':         'personal.phone',
  'mobile':            'personal.phone',
  'contact number':    'personal.phone',
  'date of birth':     'personal.dateofbirth',
  'dob':               'personal.dateofbirth',
  'birth date':        'personal.dateofbirth',
  'age':               'personal.age',
  'gender':            'personal.gender',
  'sex':               'personal.gender',
  'ssn':               'personal.ssn',
  'social security':   'personal.ssn',

  // Address
  'street address':    'personal.address.street',
  'street':            'personal.address.street',
  'address line':      'personal.address.street',
  'city':              'personal.address.city',
  'town':              'personal.address.city',
  'state':             'personal.address.state',
  'province':          'personal.address.state',
  'zip':               'personal.address.zip',
  'postal':            'personal.address.zip',
  'country':           'personal.address.country',

  // Professional
  'position':          'professional.currenttitle',
  'job title':         'professional.currenttitle',
  'title':             'professional.currenttitle',
  'preferred department': 'professional.department',
  'department':        'professional.department',
  'company':           'professional.company',
  'employer':          'professional.company',
  'current employer':  'professional.company',
  'organization':      'professional.company',
  'employment status': 'professional.employmentstatus',
  'monthly income':    'professional.monthlyincome',
  'income':            'professional.monthlyincome',
  'length of employment': 'professional.lengthofemployment',
  'years of experience': 'professional.yearsexperience',
  'linkedin':          'professional.linkedinurl',
  'cover letter':      'professional.coverletterbody',

  // Academic / Research
  'research title':    'academic.researchtitle',
  'paper title':       'academic.researchtitle',
  'research area':     'academic.researchtitle',
  'abstract':          'academic.paperabstract',
  'paper abstract':    'academic.paperabstract',
  'keywords':          'academic.keywords',
  'authors':           'academic.primaryauthors',
  'conference':        'academic.targetconference',
  'submission category': 'academic.submissioncategory',
  'grant purpose':     'academic.grantpurpose',
  'funding amount':    'academic.fundingamount',
  'institution':       'academic.institution',

  // Health
  'policy number':     'health.policynumber',
  'date of service':   'health.dateofservice',
  'claim amount':      'health.claimamount',
  'type of service':   'health.typeofservice',
  'diagnosis':         'health.diagnosis',
  'condition':         'health.diagnosis',
  'provider name':     'health.providername',
  'provider id':       'health.providernumber',
  'medical condition': 'health.medicalconditions',
  'medications':       'health.currentmedications',
  'study type':        'health.studypreference',
  'availability':      'health.availability',

  // Legal
  'party name':        'personal.fullname',
  'party type':        'legal.partytype',
  'nda purpose':       'legal.ndapurpose',
  'purpose of nda':    'legal.ndapurpose',
  'effective date':    'legal.effectivedate',
  'duration':          'legal.ndadurationyears',
  'representative':    'legal.representativename',

  // Finance
  'loan amount':       'finance.loanamount',
  'loan term':         'finance.loanterm',
  'type of consultation': 'finance.consultationtype',
  'preferred date':    'finance.preferredconsultationdate',
  'preferred time':    'finance.preferredconsultationtime',
  'additional comments': 'rental.additionalcomments',
  'account type':      'finance.bankaccounttype',
  'routing number':    'finance.routingnumber',
  'initial deposit':   'finance.initialdeposit',

  // Rental
  'move-in date':      'rental.preferredmoveindate',
  'move in date':      'rental.preferredmoveindate',
  'lease term':        'rental.preferredleaseterm',
  'monthly rent':      'rental.maxmonthlyrent',
  'preferred area':    'rental.preferredarea',
  'pets':              'rental.haspets',

  // Arts
  'artwork title':     'arts.artworktitle',
  'artwork medium':    'arts.artworkmedium',
  'artwork year':      'arts.artworkyear',
  'artwork description': 'arts.artworkdescription',
  'submission category arts': 'arts.submissioncategory',
  'artist bio':        'arts.artistbio',
  'biography':         'arts.artistbio',
  'submission title':  'arts.magazinesubmissiontitle',
  'genre':             'arts.submissiongenre',
  'word count':        'arts.wordcount',

  // Conference
  'talk title':        'conference.talktitle',
  'session title':     'conference.talktitle',
  'talk abstract':     'conference.talkabstract',
  'session type':      'conference.sessiontype',
  'speaker bio':       'conference.speakerbio',
  'travel expenses':   'conference.requirestravelexpenses',

  // Membership
  'membership type':   'membership.membershiptype',
  'referral':          'membership.referralsource',
  'how did you hear':  'membership.referralsource',
  'newsletter':        'extra.subscribetonewsletter',
  'subscribe':         'extra.subscribetonewsletter',

  // Workshop
  'dietary':           'workshop.dietaryrestrictions',
  'emergency contact': 'workshop.emergencycontactname',
  'emergency phone':   'workshop.emergencycontactphone',
  't-shirt':           'workshop.tshirtsize',
  'shirt size':        'workshop.tshirtsize',

  // Startup
  'company name':      'startup.startupname',
  'startup name':      'startup.startupname',
  'funding':           'startup.fundingamountrequested',
  'business stage':    'startup.businessstage',
  'industry':          'startup.industry',
  'team size':         'startup.teamsize',
  'business description': 'startup.businessdescription',

  // Manufacturing / Construction
  'customer account':  'manufacturing.customeraccountnumber',
  'account number':    'manufacturing.customeraccountnumber',
  'product type':      'manufacturing.producttype',
  'product description': 'manufacturing.productdescription',
  'quantity':          'manufacturing.quantity',
  'dimensions':        'manufacturing.dimensions',
  'material':          'manufacturing.material',
  'quality standards': 'manufacturing.qualitystandards',
  'delivery date':     'manufacturing.deliverydate',
  'shipping method':   'manufacturing.shippingmethod',
  'contractor license': 'construction.contractorlicensenumber',
  'project name':      'construction.projectname',
  'bid amount':        'construction.bidamount',
  'scope of work':     'construction.scopeofwork',
  'contact person':    'construction.contactperson',
};

// ── Agent ─────────────────────────────────────────────────────────────────────

export class RuleBasedAgent implements PortalAgent {
  readonly name = 'rule-based' as const;

  async fill(form: ScrapedForm, profile: FlatProfile): Promise<FieldFillResult> {
    const fills: FieldFill[] = form.fields.map(field =>
      this.matchField(field, profile)
    );
    return { fills };
  }

  private matchField(field: ScrapedField, profile: FlatProfile): FieldFill {
    // Build a text fingerprint from all available field metadata
    const fingerprint = [
      field.label,
      field.name,
      field.placeholder,
      field.id,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Try every keyword in order (longest match first for specificity)
    const sortedKeywords = Object.keys(KEYWORD_MAP).sort(
      (a, b) => b.length - a.length
    );

    for (const keyword of sortedKeywords) {
      if (!fingerprint.includes(keyword)) continue;

      const profileKey = KEYWORD_MAP[keyword];
      let value = profile[profileKey];
      
      if (value !== undefined) {
        // Dropdown option matching: select the option matching case-insensitively or via substring
        if (field.type === 'select' && field.options?.length) {
          const matchedOpt = field.options.find(
            opt => opt.toLowerCase() === value.toLowerCase() ||
                   opt.toLowerCase().includes(value.toLowerCase()) ||
                   value.toLowerCase().includes(opt.toLowerCase())
          );
          if (matchedOpt) {
            value = matchedOpt;
          }
        }

        // Checkbox normalization
        if (field.type === 'checkbox') {
          const isTrue = ['true', '1', 'yes', 'on', 'agree'].includes(String(value).toLowerCase());
          value = isTrue ? 'true' : 'false';
        }

        return {
          fieldId: field.id,
          label: field.label,
          type: field.type,
          value,
          matchedProfileKey: profileKey,
          confidence: 1.0,
        };
      }
    }

    // No match
    return {
      fieldId: field.id,
      label: field.label,
      type: field.type,
      value: undefined,
      matchedProfileKey: undefined,
      confidence: 0,
    };
  }
}
