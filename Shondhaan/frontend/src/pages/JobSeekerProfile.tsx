import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import JobsMenuBar from "@/components/jobs/JobsMenuBar";
import JobsPageTransition from "@/components/jobs/JobsPageTransition";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useJobSeekerProfile, useUpsertJobSeekerProfile, JOB_CATEGORIES } from "@/hooks/useJobData";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Plus, Trash2, User, Briefcase, GraduationCap, Award, Languages, Phone, Mail, MapPin, Calendar, FileText, Camera, Upload, Eye, Video, VideoOff, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const JobSeekerProfile = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const bn = language === "bn";

  const { data: existingProfile, isLoading } = useJobSeekerProfile();
  const upsert = useUpsertJobSeekerProfile();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("any");
  const [maritalStatus, setMaritalStatus] = useState("single");
  const [aboutMe, setAboutMe] = useState("");
  const [careerObjective, setCareerObjective] = useState("");
  const [presentSalary, setPresentSalary] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [education, setEducation] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [training, setTraining] = useState<any[]>([]);
  const [languagesList, setLanguagesList] = useState<any[]>([]);
  const [referencePeople, setReferencePeople] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [preferredDistricts, setPreferredDistricts] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [videoCvUrl, setVideoCvUrl] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (existingProfile) {
      setFullName(existingProfile.full_name || "");
      setPhone(existingProfile.phone || "");
      setEmail(existingProfile.email || "");
      setAddress(existingProfile.address || "");
      setDob(existingProfile.date_of_birth || "");
      setGender(existingProfile.gender || "any");
      setMaritalStatus(existingProfile.marital_status || "single");
      setAboutMe(existingProfile.about_me || "");
      setCareerObjective(existingProfile.career_objective || "");
      setPresentSalary(existingProfile.present_salary?.toString() || "");
      setExpectedSalary(existingProfile.expected_salary?.toString() || "");
      setSkills(existingProfile.skills || []);
      setEducation(existingProfile.education || []);
      setExperience(existingProfile.experience || []);
      setTraining(existingProfile.training || []);
      setLanguagesList(existingProfile.languages || []);
      setReferencePeople(existingProfile.reference_persons || []);
      setPhotoUrl(existingProfile.photo_url || "");
      setPreferredCategories(existingProfile.preferred_job_categories || []);
      setPreferredDistricts(existingProfile.preferred_districts || []);
      setIsAvailable(existingProfile.is_available !== false);
      setVideoCvUrl((existingProfile as any).video_cv_url || "");
    }
  }, [existingProfile]);

  if (!user) { navigate("/auth"); return null; }

  const calculateCompleteness = () => {
    let score = 0;
    if (fullName) score += 10;
    if (phone) score += 8;
    if (email) score += 5;
    if (photoUrl) score += 10;
    if (aboutMe) score += 8;
    if (careerObjective) score += 8;
    if (skills.length > 0) score += 12;
    if (education.length > 0) score += 12;
    if (experience.length > 0) score += 12;
    if (address) score += 5;
    if (referencePeople.length > 0) score += 5;
    if (languagesList.length > 0) score += 5;
    return Math.min(score, 100);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(bn ? "ছবি ২MB এর ছোট হতে হবে" : "Photo must be under 2MB"); return; }
    setPhotoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `job-profiles/${user.id}/photo.${ext}`;
      const { error: upErr } = await supabase.storage.from("cms-images").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("cms-images").getPublicUrl(path);
      setPhotoUrl(publicUrl);
      toast.success(bn ? "ছবি আপলোড হয়েছে" : "Photo uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) { toast.error(bn ? "নাম দিন" : "Name required"); return; }
    const completeness = calculateCompleteness();
    await upsert.mutateAsync({
      full_name: fullName,
      phone: phone || null,
      email: email || null,
      address: address || null,
      date_of_birth: dob || null,
      gender,
      marital_status: maritalStatus,
      about_me: aboutMe || null,
      career_objective: careerObjective || null,
      present_salary: presentSalary ? parseFloat(presentSalary) : null,
      expected_salary: expectedSalary ? parseFloat(expectedSalary) : null,
      skills,
      education,
      experience,
      training,
      languages: languagesList,
      reference_persons: referencePeople,
      profile_completeness: completeness,
      photo_url: photoUrl || null,
      preferred_job_categories: preferredCategories,
      preferred_districts: preferredDistricts,
      is_available: isAvailable,
      video_cv_url: videoCvUrl || null,
    } as any);
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const addEducation = () => setEducation([...education, { degree: "", institution: "", passing_year: "", result: "" }]);
  const addExperience = () => setExperience([...experience, { company: "", designation: "", from: "", to: "", currently_working: false, responsibilities: "" }]);
  const addTraining = () => setTraining([...training, { title: "", institution: "", year: "", duration: "" }]);
  const addLanguage = () => setLanguagesList([...languagesList, { name: "", reading: "good", writing: "good", speaking: "good" }]);
  const addReference = () => setReferencePeople([...referencePeople, { name: "", designation: "", organization: "", phone: "", email: "", relation: "" }]);

  // Video CV functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = URL.createObjectURL(blob);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      toast.error(bn ? "ক্যামেরা অ্যাক্সেস পাওয়া যায়নি" : "Could not access camera");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsRecording(false);
  };

  const uploadVideoCv = async (file: Blob, ext: string = "webm") => {
    if (!user) return;
    if (file.size > 50 * 1024 * 1024) { toast.error(bn ? "ভিডিও ৫০MB এর ছোট হতে হবে" : "Video must be under 50MB"); return; }
    setVideoUploading(true);
    try {
      const path = `${user.id}/video-cv.${ext}`;
      const { error: upErr } = await supabase.storage.from("video-cvs").upload(path, file, { upsert: true, contentType: ext === 'webm' ? 'video/webm' : 'video/mp4' });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("video-cvs").getPublicUrl(path);
      setVideoCvUrl(publicUrl);
      setRecordedBlob(null);
      toast.success(bn ? "ভিডিও সিভি আপলোড হয়েছে" : "Video CV uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setVideoUploading(false);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop() || 'mp4';
    await uploadVideoCv(file, ext);
  };

  const deleteVideoCv = async () => {
    if (!user) return;
    setVideoCvUrl("");
    setRecordedBlob(null);
    toast.success(bn ? "ভিডিও সিভি মুছে ফেলা হয়েছে" : "Video CV removed");
  };

  const completeness = calculateCompleteness();

  if (isLoading) {
    return (
      <JobsPageTransition>
        <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-card" /><JobsMenuBar />
        <div className="mx-auto max-w-3xl px-4 py-12"><div className="h-48 rounded-xl bg-muted animate-pulse" /></div>
      </JobsPageTransition>
    );
  }

  return (
    <JobsPageTransition>
      <Navbar />
      <div className="pt-[44px] md:pt-[68px] bg-card" />
      <JobsMenuBar />

      <div className="mx-auto max-w-3xl px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")} className="-ml-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" /> Yess Jobs
          </Button>
          <Button onClick={handleSave} disabled={upsert.isPending} className="bg-blue-600 hover:bg-blue-700 gap-1">
            <Save className="h-3.5 w-3.5" /> {upsert.isPending ? "..." : bn ? "সংরক্ষণ" : "Save"}
          </Button>
        </div>

        {/* Profile Completeness */}
        <div className="rounded-xl border bg-card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              {bn ? "প্রোফাইল সম্পূর্ণতা" : "Profile Completeness"}
            </h2>
            <span className="text-sm font-bold text-blue-600">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          {completeness < 70 && <p className="text-[11px] text-muted-foreground mt-1">{bn ? "৭০% সম্পূর্ণ করলে নিয়োগদাতারা আপনাকে খুঁজে পাবেন" : "Complete 70% to be discoverable by employers"}</p>}
        </div>

        {/* Personal Info with Photo */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2"><User className="h-4 w-4" /> {bn ? "ব্যক্তিগত তথ্য" : "Personal Information"}</h3>
          
          {/* Photo Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 flex items-center justify-center overflow-hidden">
                {photoUrl ? (
                  <img src={photoUrl} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Camera className="h-8 w-8 text-blue-300" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-lg p-1.5 shadow-md hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-3 w-3" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-xs font-medium">{bn ? "প্রোফাইল ছবি" : "Profile Photo"}</p>
              <p className="text-[10px] text-muted-foreground">{bn ? "সর্বোচ্চ ২MB, JPG/PNG" : "Max 2MB, JPG/PNG"}</p>
              {photoUploading && <p className="text-[10px] text-blue-600 animate-pulse">{bn ? "আপলোড হচ্ছে..." : "Uploading..."}</p>}
              
              {/* Availability Toggle */}
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} className="rounded" />
                <span className="text-xs">{bn ? "চাকরির জন্য উপলব্ধ" : "Available for jobs"}</span>
              </label>
            </div>
          </div>

          <Input placeholder={bn ? "পূর্ণ নাম *" : "Full Name *"} value={fullName} onChange={e => setFullName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder={bn ? "মোবাইল" : "Phone"} value={phone} onChange={e => setPhone(e.target.value)} />
            <Input placeholder={bn ? "ইমেইল" : "Email"} value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <Input placeholder={bn ? "ঠিকানা" : "Address"} value={address} onChange={e => setAddress(e.target.value)} />
          <div className="grid grid-cols-3 gap-3">
            <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
            <select value={gender} onChange={e => setGender(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="any">{bn ? "লিঙ্গ" : "Gender"}</option>
              <option value="male">{bn ? "পুরুষ" : "Male"}</option>
              <option value="female">{bn ? "মহিলা" : "Female"}</option>
              <option value="other">{bn ? "অন্যান্য" : "Other"}</option>
            </select>
            <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="rounded-lg border bg-background px-3 py-2 text-sm">
              <option value="single">{bn ? "অবিবাহিত" : "Single"}</option>
              <option value="married">{bn ? "বিবাহিত" : "Married"}</option>
            </select>
          </div>
        </div>

        {/* Career Objective */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2"><Briefcase className="h-4 w-4" /> {bn ? "ক্যারিয়ার উদ্দেশ্য" : "Career Objective"}</h3>
          <Textarea placeholder={bn ? "আপনার ক্যারিয়ার লক্ষ্য লিখুন..." : "Write your career objective..."} value={careerObjective} onChange={e => setCareerObjective(e.target.value)} rows={3} />
          <Textarea placeholder={bn ? "নিজের সম্পর্কে সংক্ষেপে লিখুন..." : "About me..."} value={aboutMe} onChange={e => setAboutMe(e.target.value)} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <Input type="number" placeholder={bn ? "বর্তমান বেতন (৳)" : "Present Salary (৳)"} value={presentSalary} onChange={e => setPresentSalary(e.target.value)} />
            <Input type="number" placeholder={bn ? "প্রত্যাশিত বেতন (৳)" : "Expected Salary (৳)"} value={expectedSalary} onChange={e => setExpectedSalary(e.target.value)} />
          </div>
        </div>

        {/* Skills */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2"><Award className="h-4 w-4" /> {bn ? "দক্ষতা" : "Skills"}</h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s, i) => (
              <Badge key={i} variant="secondary" className="gap-1 text-xs">
                {s} <button onClick={() => setSkills(skills.filter((_, j) => j !== i))}><Trash2 className="h-2.5 w-2.5" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder={bn ? "নতুন দক্ষতা" : "New skill"} value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())} />
            <Button variant="outline" size="sm" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Education */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2"><GraduationCap className="h-4 w-4" /> {bn ? "শিক্ষাগত যোগ্যতা" : "Education"}</h3>
            <Button variant="outline" size="sm" onClick={addEducation} className="gap-1 text-xs"><Plus className="h-3 w-3" /> {bn ? "যোগ করুন" : "Add"}</Button>
          </div>
          {education.map((edu, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <button onClick={() => setEducation(education.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              <Input placeholder={bn ? "ডিগ্রি/সার্টিফিকেট" : "Degree/Certificate"} value={edu.degree} onChange={e => { const n = [...education]; n[i].degree = e.target.value; setEducation(n); }} />
              <Input placeholder={bn ? "প্রতিষ্ঠান" : "Institution"} value={edu.institution} onChange={e => { const n = [...education]; n[i].institution = e.target.value; setEducation(n); }} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={bn ? "পাসের সাল" : "Passing Year"} value={edu.passing_year} onChange={e => { const n = [...education]; n[i].passing_year = e.target.value; setEducation(n); }} />
                <Input placeholder={bn ? "ফলাফল/GPA" : "Result/GPA"} value={edu.result} onChange={e => { const n = [...education]; n[i].result = e.target.value; setEducation(n); }} />
              </div>
            </div>
          ))}
        </div>

        {/* Experience */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2"><Briefcase className="h-4 w-4" /> {bn ? "কাজের অভিজ্ঞতা" : "Work Experience"}</h3>
            <Button variant="outline" size="sm" onClick={addExperience} className="gap-1 text-xs"><Plus className="h-3 w-3" /> {bn ? "যোগ করুন" : "Add"}</Button>
          </div>
          {experience.map((exp, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <button onClick={() => setExperience(experience.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              <Input placeholder={bn ? "প্রতিষ্ঠান" : "Company"} value={exp.company} onChange={e => { const n = [...experience]; n[i].company = e.target.value; setExperience(n); }} />
              <Input placeholder={bn ? "পদবি" : "Designation"} value={exp.designation} onChange={e => { const n = [...experience]; n[i].designation = e.target.value; setExperience(n); }} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="month" placeholder={bn ? "থেকে" : "From"} value={exp.from} onChange={e => { const n = [...experience]; n[i].from = e.target.value; setExperience(n); }} />
                <Input type="month" placeholder={bn ? "পর্যন্ত" : "To"} value={exp.to} onChange={e => { const n = [...experience]; n[i].to = e.target.value; setExperience(n); }} disabled={exp.currently_working} />
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={exp.currently_working} onChange={e => { const n = [...experience]; n[i].currently_working = e.target.checked; setExperience(n); }} className="rounded" />
                {bn ? "বর্তমানে কর্মরত" : "Currently Working"}
              </label>
              <Textarea placeholder={bn ? "দায়িত্ব ও কাজের বিবরণ" : "Responsibilities"} value={exp.responsibilities} onChange={e => { const n = [...experience]; n[i].responsibilities = e.target.value; setExperience(n); }} rows={2} />
            </div>
          ))}
        </div>

        {/* Training */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2"><Award className="h-4 w-4" /> {bn ? "প্রশিক্ষণ" : "Training & Certifications"}</h3>
            <Button variant="outline" size="sm" onClick={addTraining} className="gap-1 text-xs"><Plus className="h-3 w-3" /> {bn ? "যোগ করুন" : "Add"}</Button>
          </div>
          {training.map((t, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <button onClick={() => setTraining(training.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              <Input placeholder={bn ? "প্রশিক্ষণের নাম" : "Training Title"} value={t.title} onChange={e => { const n = [...training]; n[i].title = e.target.value; setTraining(n); }} />
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={bn ? "প্রতিষ্ঠান" : "Institution"} value={t.institution} onChange={e => { const n = [...training]; n[i].institution = e.target.value; setTraining(n); }} />
                <Input placeholder={bn ? "সাল" : "Year"} value={t.year} onChange={e => { const n = [...training]; n[i].year = e.target.value; setTraining(n); }} />
              </div>
            </div>
          ))}
        </div>

        {/* Languages */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2"><Languages className="h-4 w-4" /> {bn ? "ভাষা দক্ষতা" : "Language Proficiency"}</h3>
            <Button variant="outline" size="sm" onClick={addLanguage} className="gap-1 text-xs"><Plus className="h-3 w-3" /> {bn ? "যোগ করুন" : "Add"}</Button>
          </div>
          {languagesList.map((l, i) => (
            <div key={i} className="border rounded-lg p-3 relative">
              <button onClick={() => setLanguagesList(languagesList.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              <div className="grid grid-cols-4 gap-2">
                <Input placeholder={bn ? "ভাষা" : "Language"} value={l.name} onChange={e => { const n = [...languagesList]; n[i].name = e.target.value; setLanguagesList(n); }} />
                {["reading", "writing", "speaking"].map(sk => (
                  <select key={sk} value={l[sk]} onChange={e => { const n = [...languagesList]; n[i][sk] = e.target.value; setLanguagesList(n); }} className="rounded-lg border bg-background px-2 py-2 text-xs">
                    <option value="excellent">{bn ? "চমৎকার" : "Excellent"}</option>
                    <option value="good">{bn ? "ভালো" : "Good"}</option>
                    <option value="basic">{bn ? "প্রাথমিক" : "Basic"}</option>
                  </select>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* References */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2"><User className="h-4 w-4" /> {bn ? "রেফারেন্স" : "References"}</h3>
            <Button variant="outline" size="sm" onClick={addReference} className="gap-1 text-xs"><Plus className="h-3 w-3" /> {bn ? "যোগ করুন" : "Add"}</Button>
          </div>
          {referencePeople.map((r, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2 relative">
              <button onClick={() => setReferencePeople(referencePeople.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={bn ? "নাম" : "Name"} value={r.name} onChange={e => { const n = [...referencePeople]; n[i].name = e.target.value; setReferencePeople(n); }} />
                <Input placeholder={bn ? "পদবি" : "Designation"} value={r.designation} onChange={e => { const n = [...referencePeople]; n[i].designation = e.target.value; setReferencePeople(n); }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={bn ? "প্রতিষ্ঠান" : "Organization"} value={r.organization} onChange={e => { const n = [...referencePeople]; n[i].organization = e.target.value; setReferencePeople(n); }} />
                <Input placeholder={bn ? "মোবাইল" : "Phone"} value={r.phone} onChange={e => { const n = [...referencePeople]; n[i].phone = e.target.value; setReferencePeople(n); }} />
              </div>
            </div>
          ))}
        </div>

        {/* Video CV Section */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2">
            <Video className="h-4 w-4" /> {bn ? "ভিডিও সিভি" : "Video CV"}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {bn ? "ভিডিওতে নিজের পরিচয় দিন — নিয়োগদাতারা আপনাকে দেখতে ও শুনতে পারবেন। সর্বোচ্চ ৫০MB, ২-৩ মিনিটের ভিডিও রেকমেন্ডেড।" : "Introduce yourself on video — employers can see & hear you. Max 50MB, 2-3 min recommended."}
          </p>

          {videoCvUrl && !isRecording && !recordedBlob && (
            <div className="relative rounded-lg overflow-hidden border bg-muted">
              <video src={videoCvUrl} controls className="w-full max-h-52 rounded-lg" />
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => setShowVideoPreview(true)}>
                  <Play className="h-3 w-3" /> {bn ? "দেখুন" : "Preview"}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs text-red-600 hover:text-red-700" onClick={deleteVideoCv}>
                  <Trash2 className="h-3 w-3" /> {bn ? "মুছুন" : "Remove"}
                </Button>
              </div>
            </div>
          )}

          {isRecording && (
            <div className="relative rounded-lg overflow-hidden border bg-black">
              <video ref={videoRef} muted className="w-full max-h-52 rounded-lg" />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full animate-pulse">
                <div className="w-2 h-2 bg-white rounded-full" /> {bn ? "রেকর্ডিং..." : "Recording..."}
              </div>
            </div>
          )}

          {recordedBlob && !isRecording && (
            <div className="rounded-lg overflow-hidden border bg-muted">
              <video ref={videoRef} controls className="w-full max-h-52 rounded-lg" />
              <div className="flex gap-2 mt-2">
                <Button size="sm" className="flex-1 gap-1 text-xs bg-blue-600 hover:bg-blue-700" onClick={() => uploadVideoCv(recordedBlob)} disabled={videoUploading}>
                  <Upload className="h-3 w-3" /> {videoUploading ? "..." : bn ? "আপলোড করুন" : "Upload"}
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setRecordedBlob(null); }}>
                  <X className="h-3 w-3" /> {bn ? "বাতিল" : "Cancel"}
                </Button>
              </div>
            </div>
          )}

          {!isRecording && !recordedBlob && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={startRecording}>
                <Video className="h-3.5 w-3.5 text-red-500" /> {bn ? "রেকর্ড করুন" : "Record"}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => videoInputRef.current?.click()} disabled={videoUploading}>
                <Upload className="h-3.5 w-3.5" /> {videoUploading ? "..." : bn ? "ফাইল আপলোড" : "Upload File"}
              </Button>
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoFileUpload} className="hidden" />
            </div>
          )}

          {isRecording && (
            <Button size="sm" className="w-full gap-1.5 bg-red-600 hover:bg-red-700 text-white" onClick={stopRecording}>
              <VideoOff className="h-3.5 w-3.5" /> {bn ? "রেকর্ডিং বন্ধ করুন" : "Stop Recording"}
            </Button>
          )}
        </div>

        {/* Preferred Job Categories */}
        <div className="rounded-xl border bg-card p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-sm text-blue-700 flex items-center gap-2"><Briefcase className="h-4 w-4" /> {bn ? "পছন্দের চাকরির ক্যাটেগরি" : "Preferred Job Categories"}</h3>
          <div className="flex flex-wrap gap-2">
            {JOB_CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setPreferredCategories(prev => prev.includes(cat.value) ? prev.filter(c => c !== cat.value) : [...prev, cat.value])}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  preferredCategories.includes(cat.value) ? "bg-blue-600 text-white border-blue-600" : "bg-background border-border hover:bg-muted"
                }`}
              >
                {bn ? cat.labelBn : cat.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom Save */}
        <Button onClick={handleSave} disabled={upsert.isPending} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold gap-2">
          <Save className="h-5 w-5" /> {upsert.isPending ? (bn ? "সংরক্ষণ হচ্ছে..." : "Saving...") : bn ? "প্রোফাইল সংরক্ষণ করুন" : "Save Profile"}
        </Button>
      </div>

      <Footer />
      <div className="h-16 md:hidden" />
    </JobsPageTransition>
  );
};

export default JobSeekerProfile;
