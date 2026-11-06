import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Check,
  GraduationCap,
  LoaderCircle,
  Mail,
  Pencil,
  Save,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import {
  createStudentProfile,
  getStudentProfile,
  updateStudentProfile,
} from '../services/api.js';

const EMPTY_PROFILE = {
  fullName: '',
  profilePicture: '',
  phoneNumber: '',
  gender: '',
  dateOfBirth: '',
  collegeName: '',
  universityRollNumber: '',
  degree: '',
  specialization: '',
  currentYear: '',
  currentSemester: '',
  cgpa: '',
  technicalSkills: [],
  technicalSkillsText: '',
  programmingLanguages: [],
  programmingLanguagesText: '',
  careerGoal: '',
  linkedinUrl: '',
  githubUrl: '',
  bio: '',
  academicTrack: '',
  targetExamDate: '',
  dailyStudyTarget: '',
  subjects: [],
};
const MAX_IMAGE_BYTES = 512 * 1024;
const PROFILE_COMPLETION_FIELDS = [
  'fullName',
  'phoneNumber',
  'collegeName',
  'universityRollNumber',
  'degree',
  'specialization',
  'currentYear',
  'currentSemester',
  'technicalSkills',
  'programmingLanguages',
  'careerGoal',
  'bio',
];

const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const toFormValues = (profile, account) => ({
  fullName: profile?.fullName || account?.name || '',
  profilePicture: profile?.profilePicture || '',
  phoneNumber: profile?.phoneNumber || '',
  gender: profile?.gender || '',
  dateOfBirth: toDateInput(profile?.dateOfBirth),
  collegeName: profile?.collegeName || '',
  universityRollNumber: profile?.universityRollNumber || '',
  degree: profile?.degree || '',
  specialization: profile?.specialization || '',
  currentYear: profile?.currentYear ?? '',
  currentSemester: profile?.currentSemester ?? '',
  cgpa: profile?.cgpa ?? '',
  technicalSkills: profile?.technicalSkills || [],
  technicalSkillsText: (profile?.technicalSkills || []).join(', '),
  programmingLanguages: profile?.programmingLanguages || [],
  programmingLanguagesText: (profile?.programmingLanguages || []).join(', '),
  careerGoal: profile?.careerGoal || '',
  linkedinUrl: profile?.linkedinUrl || '',
  githubUrl: profile?.githubUrl || '',
  bio: profile?.bio || '',
  academicTrack: profile?.academicTrack || '',
  targetExamDate: toDateInput(profile?.targetExamDate),
  dailyStudyTarget: profile?.dailyStudyTarget ?? '',
  subjects: profile?.subjects || [],
});

const getInitials = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'S';

function Field({
  label,
  name,
  value,
  onChange,
  type = 'text',
  required = false,
  placeholder = '',
  disabled,
  min,
  max,
  step,
  maxLength,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        className="field-control px-3.5 py-2.5 text-sm"
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, options, disabled, required = false }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className="field-control px-3.5 py-2.5 text-sm"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({ label, name, value, onChange, disabled, required, rows = 4, maxLength }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        rows={rows}
        maxLength={maxLength}
        className="field-control resize-y px-3.5 py-2.5 text-sm"
      />
    </label>
  );
}

function ProfileSection({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-7">
      <div className="mb-6 flex items-start gap-3 border-b border-slate-800 pb-4">
        <span className="rounded-lg bg-dark-800 p-2.5 text-brand-blue-light">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const [account, setAccount] = useState({});
  const [savedProfile, setSavedProfile] = useState(null);
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const response = await getStudentProfile();
      if (!active) return;
      if (!response.success) {
        if (response.status === 401) {
          navigate('/login', { replace: true });
          return;
        }
        setError(response.message || 'Could not load your profile.');
        setLoading(false);
        return;
      }

      const nextAccount = response.user || {};
      setAccount(nextAccount);
      setSavedProfile(response.profile || null);
      setForm(toFormValues(response.profile, nextAccount));
      setIsEditing(!response.profile || Boolean(location.state?.editProfile));
      setLoading(false);
    };
    loadProfile();
    return () => { active = false; };
  }, [location.state, navigate]);

  const completion = useMemo(() => {
    const completeCount = PROFILE_COMPLETION_FIELDS.filter((field) => {
      const value = field === 'technicalSkills'
        ? form.technicalSkillsText ?? form.technicalSkills
        : field === 'programmingLanguages'
          ? form.programmingLanguagesText ?? form.programmingLanguages
          : form[field];
      return Array.isArray(value) ? value.length > 0 : String(value ?? '').trim().length > 0;
    }).length;
    return Math.round((completeCount / PROFILE_COMPLETION_FIELDS.length) * 100);
  }, [form]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setError('');
    setNotice('');
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPEG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Choose an image smaller than 512 KB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((current) => ({ ...current, profilePicture: String(reader.result) }));
      setError('');
    };
    reader.onerror = () => setError('The selected image could not be read.');
    reader.readAsDataURL(file);
  };

  const handleCancel = () => {
    setForm(toFormValues(savedProfile, account));
    setError('');
    setNotice('');
    if (savedProfile) {
      setIsEditing(false);
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      ...form,
      currentYear: Number(form.currentYear),
      currentSemester: Number(form.currentSemester),
      cgpa: form.cgpa === '' ? null : Number(form.cgpa),
      dailyStudyTarget: Number(form.dailyStudyTarget),
      dateOfBirth: form.dateOfBirth || null,
      targetExamDate: form.targetExamDate || null,
      technicalSkills: form.technicalSkillsText.split(',').map((item) => item.trim()).filter(Boolean),
      programmingLanguages: form.programmingLanguagesText.split(',').map((item) => item.trim()).filter(Boolean),
    };
    delete payload.technicalSkillsText;
    delete payload.programmingLanguagesText;
    delete payload.subjects;

    const response = savedProfile
      ? await updateStudentProfile(payload)
      : await createStudentProfile(payload);

    setSaving(false);
    if (!response.success) {
      if (response.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      const validationMessages = response.errors ? Object.values(response.errors).join(' ') : '';
      setError(validationMessages || response.message || 'Your profile could not be saved.');
      return;
    }

    setSavedProfile(response.profile);
    setForm(toFormValues(response.profile, account));
    setIsEditing(false);
    setNotice('Your profile has been saved successfully.');
    window.dispatchEvent(new Event('learnpath-profile-updated'));
  };

  const displayProfile = savedProfile || form;

  if (loading) {
    return (
      <DashboardLayout pageTitle="My Profile">
        <div className="flex min-h-80 items-center justify-center rounded-xl border border-slate-800 bg-dark-900 text-slate-400">
          <LoaderCircle className="mr-3 h-5 w-5 animate-spin text-indigo-600" />
          Loading your profile...
        </div>
      </DashboardLayout>
    );
  }

  if (error && !savedProfile && !isEditing) {
    return (
      <DashboardLayout pageTitle="My Profile">
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-dark-900 p-6 text-rose-300">
          {error}
          <button onClick={() => window.location.reload()} className="ml-3 font-semibold underline">Try again</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="My Profile">
      <div className="mx-auto max-w-5xl space-y-6 text-slate-200">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-dark-900">
          <div className="flex flex-col gap-6 p-5 sm:p-8 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-blue text-xl font-semibold text-white">
                {displayProfile.profilePicture ? (
                  <img src={displayProfile.profilePicture} alt={`${displayProfile.fullName || 'Student'} profile`} className="h-full w-full object-cover" />
                ) : getInitials(displayProfile.fullName || account.name)}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-brand-blue-light">Student account</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  {displayProfile.fullName || account.name || 'Complete your profile'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{account.email}</p>
              </div>
            </div>

            <div className="w-full rounded-lg border border-slate-800 bg-dark-850 p-4 md:max-w-xs">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-300">Profile completion</span>
                <span className="text-sm font-semibold text-brand-blue-light">{completion}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-dark-800">
                <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${completion}%` }} />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                {completion === 100
                  ? 'Your profile is complete. You are ready to make the most of LearnPath.'
                  : 'Add your details to help us personalize your learning experience.'}
              </p>
            </div>
          </div>
        </div>

        {notice && (
          <div role="status" className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
            <Check className="h-4 w-4" /> {notice}
          </div>
        )}
        {error && (
          <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <ProfileSection icon={UserRound} title="Personal information" description="Your contact details and basic information.">
            <div className="mb-6 flex flex-col gap-4 rounded-lg border border-slate-800 bg-dark-850 p-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-dark-700 text-lg font-semibold text-slate-200">
                {form.profilePicture
                  ? <img src={form.profilePicture} alt="Profile preview" className="h-full w-full object-cover" />
                  : getInitials(form.fullName || account.name)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-200">Profile picture</p>
                <p className="mt-1 text-xs text-slate-500">JPEG, PNG, or WebP · maximum 512 KB</p>
              </div>
              {isEditing && (
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-dark-800 px-3 py-2 text-sm font-medium text-slate-300 hover:border-brand-blue">
                    <Upload className="h-4 w-4 text-brand-blue-light" />
                    Upload photo
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="sr-only" />
                  </label>
                  {form.profilePicture && (
                    <button type="button" onClick={() => setForm((current) => ({ ...current, profilePicture: '' }))} className="rounded-lg px-2 py-2 text-sm text-slate-400 hover:bg-dark-800">
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} disabled={!isEditing} required maxLength={100} placeholder="Your full name" />
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Email address</span>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={account.email || ''} readOnly className="field-control py-2.5 pl-9 pr-3.5 text-sm" />
                </div>
                <span className="mt-1 block text-xs text-slate-400">Email is managed by your account.</span>
              </label>
              <Field label="Phone number" name="phoneNumber" type="tel" value={form.phoneNumber} onChange={handleChange} disabled={!isEditing} required maxLength={20} placeholder="+1 555 123 4567" />
              <SelectField label="Gender (optional)" name="gender" value={form.gender} onChange={handleChange} disabled={!isEditing} options={[
                ['', 'Prefer not to say'],
                ['female', 'Female'],
                ['male', 'Male'],
                ['non-binary', 'Non-binary'],
                ['other', 'Other'],
              ]} />
              <Field label="Date of birth (optional)" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={handleChange} disabled={!isEditing} max={new Date().toISOString().slice(0, 10)} />
            </div>
          </ProfileSection>

          <ProfileSection icon={GraduationCap} title="Academic information" description="Tell us about your current studies and academic goals.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="College / university" name="collegeName" value={form.collegeName} onChange={handleChange} disabled={!isEditing} required maxLength={150} placeholder="Institution name" />
              <Field label="University roll number" name="universityRollNumber" value={form.universityRollNumber} onChange={handleChange} disabled={!isEditing} required maxLength={50} placeholder="Your roll number" />
              <Field label="Degree" name="degree" value={form.degree} onChange={handleChange} disabled={!isEditing} required maxLength={100} placeholder="e.g. B.Tech, BCA, MCA" />
              <Field label="Branch / specialization" name="specialization" value={form.specialization} onChange={handleChange} disabled={!isEditing} required maxLength={100} placeholder="e.g. Computer Science" />
              <Field label="Current year" name="currentYear" type="number" value={form.currentYear} onChange={handleChange} disabled={!isEditing} required min={1} max={8} step={1} placeholder="e.g. 2" />
              <Field label="Current semester" name="currentSemester" type="number" value={form.currentSemester} onChange={handleChange} disabled={!isEditing} required min={1} max={16} step={1} placeholder="e.g. 4" />
              <Field label="CGPA (optional, out of 10)" name="cgpa" type="number" value={form.cgpa} onChange={handleChange} disabled={!isEditing} min={0} max={10} step={0.01} placeholder="e.g. 8.25" />
              <Field label="Academic track / course" name="academicTrack" value={form.academicTrack} onChange={handleChange} disabled={!isEditing} required maxLength={100} placeholder="Your course or learning track" />
              <Field label="Target exam date (optional)" name="targetExamDate" type="date" value={form.targetExamDate} onChange={handleChange} disabled={!isEditing} />
              <Field label="Daily study target (hours)" name="dailyStudyTarget" type="number" value={form.dailyStudyTarget} onChange={handleChange} disabled={!isEditing} required min={0.25} max={24} step={0.25} placeholder="e.g. 2.5" />
            </div>
          </ProfileSection>

          <ProfileSection icon={BriefcaseBusiness} title="Professional information" description="Share your skills and the direction you want your career to take.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Technical skills"
                name="technicalSkillsText"
                value={form.technicalSkillsText ?? (form.technicalSkills || []).join(', ')}
                onChange={handleChange}
                disabled={!isEditing}
                required
                placeholder="e.g. React, Data Structures, MongoDB"
              />
              <Field
                label="Programming languages"
                name="programmingLanguagesText"
                value={form.programmingLanguagesText ?? (form.programmingLanguages || []).join(', ')}
                onChange={handleChange}
                disabled={!isEditing}
                required
                placeholder="e.g. JavaScript, Python"
              />
              <Field label="Career goal" name="careerGoal" value={form.careerGoal} onChange={handleChange} disabled={!isEditing} required maxLength={300} placeholder="e.g. Become a machine learning engineer" />
              <Field label="LinkedIn profile URL (optional)" name="linkedinUrl" type="url" value={form.linkedinUrl} onChange={handleChange} disabled={!isEditing} maxLength={300} placeholder="https://www.linkedin.com/in/your-name" />
              <Field label="GitHub profile URL (optional)" name="githubUrl" type="url" value={form.githubUrl} onChange={handleChange} disabled={!isEditing} maxLength={300} placeholder="https://github.com/your-name" />
              <div className="md:col-span-2">
                <TextAreaField label="Short bio" name="bio" value={form.bio} onChange={handleChange} disabled={!isEditing} required maxLength={1000} rows={4} />
              </div>
            </div>
          </ProfileSection>

          <div className="sticky bottom-3 z-10 flex flex-col-reverse gap-3 rounded-xl border border-slate-800 bg-dark-900 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-dark-800">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </button>
            {isEditing ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <button type="button" onClick={handleCancel} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-dark-800 disabled:opacity-50">
                  <X className="h-4 w-4" /> Cancel
                </button>
                <button type="submit" disabled={saving} className="button-primary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setIsEditing(true)} className="button-primary inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium">
                <Pencil className="h-4 w-4" /> Edit profile
              </button>
            )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
