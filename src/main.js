import { createClient } from "@supabase/supabase-js";
import {
  ArrowDownToLine, ArrowRight, Atom, BookOpen, BookOpenCheck, Check, ChevronDown,
  ChevronRight, CircleHelp, Clock3, FileImage, FileText, FlaskConical, GraduationCap, Laptop,
  Link2, LogIn, LogOut, Menu, MessageCircle, Search, Send, ShieldCheck, Sparkles,
  Users, UserPlus, MoreHorizontal, X, createElement,
} from "lucide";

const app = document.querySelector("#app");
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const demoMode = !supabase;

const subjectFallback = [
  ["chemistry", "PBA Chemistry"],
  ["physics", "PBA Physics"],
  ["computer-science", "PBA Computer Science"],
  ["existing-1", "Existing subject 1"],
  ["existing-2", "Existing subject 2"],
  ["existing-3", "Existing subject 3"],
  ["existing-4", "Existing subject 4"],
].map(([id, name], sort_order) => ({ id, name, slug: id, sort_order }));
const demoResources = [
  { id: "cs-pba-complingo", subject_id: "computer-science", title: "Complingo PBA notes", class_grade: "All classes", topic: "PBA notes", resource_type: "pba", description: null, external_url: "https://muhammad4bdullah.github.io/complingo/#", file_path: null, file_name: null },
  { id: "cs-pba-notes", subject_id: "computer-science", title: "Computer Science PBA notes", class_grade: "All classes", topic: "PBA notes", resource_type: "pba", description: null, external_url: "https://muhammad4bdullah.github.io/CS-PBA/", file_path: null, file_name: null },
];

const navItems = [
  ["overview", "Overview", BookOpen],
  ["subjects", "Subjects", GraduationCap],
  ["exam", "Exam prep", BookOpenCheck],
];
const subjectIcons = [FlaskConical, Atom, Laptop, BookOpen, BookOpen, BookOpen, BookOpen];
const tints = ["sage", "sky", "peach", "lilac", "lemon", "rose", "mint"];
const resourceTypes = [
  ["notes", "Notes"],
  ["pba", "PBA practice"],
  ["past_paper", "Past paper"],
  ["exam_prep", "Exam prep"],
];
const state = {
  view: window.location.pathname.endsWith("/admin.html") ? "admin" : "overview",
  subjects: subjectFallback,
  resources: demoMode ? demoResources : [],
  profile: null,
  userId: "",
  selectedSubject: "",
  search: "",
  grade: "all",
  topic: "all",
  resourceType: "all",
  authOpen: false,
  authMode: "signin",
  profileOpen: false,
  profileMenuOpen: false,
  modalError: "",
  mobileOpen: false,
  notice: "",
  busy: false,
  requests: [],
  people: [],
  friendSearch: "",
  friendResults: [],
  conversationId: "",
  conversationName: "",
  conversationType: "friend",
  teacherId: "",
  teacherConversations: [],
  messages: [],
};

const iconNodes = {
  ArrowDownToLine, ArrowRight, Atom, BookOpen, BookOpenCheck, Check, ChevronDown,
  ChevronRight, CircleHelp, FileImage, FileText, FlaskConical, GraduationCap, Laptop,
  Link2, LogIn, LogOut, Menu, MessageCircle, Search, Send, ShieldCheck, Sparkles,
  Users, UserPlus, MoreHorizontal, Clock3, X,
};

function icon(name, size = 18) {
  const node = iconNodes[name];
  if (!node) return "";
  const element = createElement(node);
  element.setAttribute("width", String(size));
  element.setAttribute("height", String(size));
  element.setAttribute("stroke", "currentColor");
  element.setAttribute("aria-hidden", "true");
  return element.outerHTML;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function initials(value = "") {
  return value.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function resourceLabel(value) {
  return resourceTypes.find(([id]) => id === value)?.[1] ?? "Resource";
}

function resourceUrl(resource) {
  if (resource.external_url) {
    try {
      const url = new URL(resource.external_url);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
    } catch {
      return "#";
    }
  }
  if (resource.file_path && supabase) {
    return supabase.storage.from("study-resources").getPublicUrl(resource.file_path).data.publicUrl;
  }
  return "#";
}

function setNotice(message) {
  state.notice = message;
  render();
}

function setView(view, preserveSubject = false) {
  state.view = view;
  state.mobileOpen = false;
  state.profileMenuOpen = false;
  state.notice = "";
  if (view !== "messages") {
    state.conversationId = "";
    state.conversationType = "friend";
    state.conversationType = "friend";
    state.messages = [];
    stopMessageSubscription();
  }
  if (["subjects", "exam"].includes(view) && !preserveSubject) state.selectedSubject = "";
  render();
  if (view === "messages" && state.userId) void loadSocial();
}

function openAuth() {
  if (demoMode) {
    setNotice("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the app.");
    return;
  }
  state.authOpen = true;
  state.modalError = "";
  render();
}

function pageHeading(eyebrow, title, subtitle) {
  return `<section class="page-heading"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></section>`;
}

function subjectGrid(compact = false) {
  return `<div class="subject-grid ${compact ? "subject-grid-compact" : ""}">${state.subjects.map((subject, index) => {
    const Icon = subjectIcons[index] ?? BookOpen;
    const count = state.resources.filter((resource) => resource.subject_id === subject.id).length;
    return `<button class="subject-card ${state.selectedSubject === subject.id ? "subject-card-selected" : ""}" data-subject="${escapeHtml(subject.id)}">
      <span class="subject-card-top"><span class="subject-card-icon ${tints[index]}">${iconName(Icon, 20)}</span><span class="subject-card-arrow">${icon("ArrowRight", 15)}</span></span>
      <strong>${escapeHtml(subject.name)}</strong><span class="subject-card-count">${count ? `${count} ${count === 1 ? "resource" : "resources"}` : "Ready for resources"}</span>
    </button>`;
  }).join("")}</div>`;
}

function iconName(Icon, size) {
  const name = Object.entries(iconNodes).find(([, value]) => value === Icon)?.[0];
  return icon(name, size);
}

function visibleResources() {
  return state.resources.filter((resource) => {
    const subject = state.subjects.find((item) => item.id === resource.subject_id)?.name ?? "";
    const text = `${resource.title} ${resource.topic} ${resource.class_grade} ${resource.description ?? ""} ${subject}`.toLowerCase();
    return text.includes(state.search.toLowerCase())
      && (!state.selectedSubject || resource.subject_id === state.selectedSubject)
      && (state.grade === "all" || resource.class_grade === state.grade)
      && (state.topic === "all" || resource.topic === state.topic)
      && (state.resourceType === "all" || resource.resource_type === state.resourceType);
  });
}

function filterBar() {
  const grades = [...new Set(state.resources.map((item) => item.class_grade))].filter(Boolean).sort();
  const topics = [...new Set(state.resources.map((item) => item.topic))].filter(Boolean).sort();
  const select = (label, current, values, action) => `<select aria-label="${label}" data-filter="${action}"><option value="all">${label}</option>${values.map((value) => `<option value="${escapeHtml(value)}" ${current === value ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}</select>`;
  return `<div class="filter-bar"><label class="library-search">${icon("Search", 17)}<input name="search" value="${escapeHtml(state.search)}" placeholder="Search resources or topics" aria-label="Search resources or topics" />${state.search ? `<button class="icon-button tiny" data-action="clear-search" aria-label="Clear search">${icon("X", 14)}</button>` : ""}</label><span class="filter-divider"></span>${select("All classes", state.grade, grades, "grade")}${select("All topics", state.topic, topics, "topic")}<select aria-label="Filter by resource type" data-filter="resourceType"><option value="all">All types</option>${resourceTypes.map(([id, label]) => `<option value="${id}" ${state.resourceType === id ? "selected" : ""}>${label}</option>`).join("")}</select></div>`;
}

function resourceList(items) {
  if (!items.length) return emptyState(state.view === "exam");
  return `<div class="resource-list">${items.map((item) => {
    const subject = state.subjects.find((entry) => entry.id === item.subject_id)?.name ?? "Subject";
    const ext = item.file_name?.split(".").pop()?.toLowerCase();
    const iconNameValue = ext && ["png", "jpg", "jpeg", "webp"].includes(ext) ? "FileImage" : item.external_url ? "Link2" : "FileText";
    const href = resourceUrl(item);
    return `<article class="resource-row"><span class="resource-icon">${icon(iconNameValue, 18)}</span><div class="resource-copy"><div class="resource-title-line"><a class="resource-title-button" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a><span class="resource-mobile-type">${escapeHtml(resourceLabel(item.resource_type))}</span></div><p>${escapeHtml(subject)}<span>-</span>${escapeHtml(item.class_grade)}<span>-</span>${escapeHtml(item.topic)}</p>${item.description ? `<small>${escapeHtml(item.description)}</small>` : ""}</div><span class="resource-type-tag">${escapeHtml(resourceLabel(item.resource_type))}</span><a class="resource-open" href="${escapeHtml(href)}" target="_blank" rel="noreferrer" aria-label="Open ${escapeHtml(item.title)}" title="Open resource">${icon(item.external_url ? "ArrowRight" : "ArrowDownToLine", 17)}</a></article>`;
  }).join("")}</div>`;
}

function emptyState(exam) {
  return `<div class="empty-state"><span class="empty-illustration">${icon("BookOpenCheck", 24)}</span><h3>${exam ? "Nothing to revise here yet." : "A fresh page."}</h3><p>${exam ? "Exam practice and past papers will show up here when they are shared. Try another subject or check back later." : "There are no resources here yet. When a teacher shares notes or links, you will find them here."}</p></div>`;
}

function personRow(person, action, selected = false) {
  const name = person.display_name || person.username;
  return `<div class="person-row ${selected ? "person-selected" : ""}" data-person="${escapeHtml(person.id)}" role="button" tabindex="0"><span class="avatar avatar-small">${escapeHtml(initials(name))}</span><span class="person-copy"><strong>${escapeHtml(name)}</strong><small>@${escapeHtml(person.username)}</small></span><span class="person-action">${action}</span></div>`;
}

function messageView() {
  const heading = pageHeading("STUDY TOGETHER", "Messages", "Message your teacher or find a friend.");
  if (demoMode || !state.profile) {
    const title = demoMode ? "Connect to find your people" : "Sign in to message";
    const copy = demoMode
      ? "Teacher messages and private friend conversations are available when Supabase is connected."
      : "Create an account or sign in to message your teacher and find friends.";
    return `${heading}<div class="connection-gate"><div class="gate-icon">${icon("Users", 24)}</div><h2>${title}</h2><p>${copy}</p>${!demoMode ? `<button class="button button-dark" data-action="auth">Sign in or join ${icon("ArrowRight", 15)}</button>` : ""}</div>`;
  }
  const incoming = state.requests.filter((request) => request.status === "pending" && request.recipient_id === state.userId);
  const outgoing = state.requests.filter((request) => request.status === "pending" && request.requester_id === state.userId);
  const friends = state.requests.filter((request) => request.status === "accepted").map((request) => state.people.find((person) => person.id === (request.requester_id === state.userId ? request.recipient_id : request.requester_id))).filter(Boolean);
  const requestRows = incoming.length ? incoming.map((request) => {
    const person = state.people.find((item) => item.id === request.requester_id);
    return person ? personRow(person, `<button class="icon-button accept-icon" data-action="accept" data-id="${request.id}" title="Accept request" aria-label="Accept request">${icon("Check", 16)}</button><button class="icon-button" data-action="reject" data-id="${request.id}" title="Decline request" aria-label="Decline request">${icon("X", 16)}</button>`) : "";
  }).join("") : `<p class="quiet-empty">No incoming requests.</p>`;
  const friendRows = friends.length ? friends.map((person) => personRow(person, `<button class="icon-button" data-action="open-chat" data-id="${person.id}" title="Open conversation" aria-label="Message ${escapeHtml(person.username)}">${icon("MessageCircle", 16)}</button>`, state.conversationId && state.conversationName === (person.display_name || person.username))).join("") : `<p class="quiet-empty">Accepted friends appear here.</p>`;
  const resultRows = state.friendResults.map((person) => personRow(person, `<button class="icon-button accept-icon" data-action="friend-request" data-id="${person.id}" title="Send friend request" aria-label="Add @${escapeHtml(person.username)}">${icon("UserPlus", 17)}</button>`)).join("");
  const teacherRows = state.profile.role === "admin"
    ? state.teacherConversations.map(({ conversation }) => `<div class="person-row"><span class="avatar avatar-small">${icon("GraduationCap", 16)}</span><span class="person-copy"><strong>Student</strong><small>Private conversation</small></span><span class="person-action"><button class="icon-button" data-action="open-teacher-chat" data-id="${conversation.id}" title="Open student conversation" aria-label="Open student conversation">${icon("MessageCircle", 16)}</button></span></div>`).join("") || `<p class="quiet-empty">Student messages will appear here.</p>`
    : `<div class="person-row teacher-row ${state.conversationType === "teacher" ? "person-selected" : ""}"><span class="avatar avatar-small">${icon("GraduationCap", 16)}</span><span class="person-copy"><strong>Teacher</strong><small>${state.teacherId ? "Request notes or ask a question" : "No admin account is available yet"}</small></span><span class="person-action">${state.teacherId ? `<button class="icon-button" data-action="open-teacher-chat" title="Message teacher" aria-label="Message teacher">${icon("MessageCircle", 16)}</button>` : ""}</span></div>`;
  const chatContent = state.conversationId
    ? `<div class="chat-header"><button class="icon-button chat-back" data-action="close-chat" aria-label="Back to conversations">${icon("ChevronRight", 19)}</button><span class="avatar avatar-small">${state.conversationType === "teacher" ? icon("GraduationCap", 16) : escapeHtml(initials(state.conversationName))}</span><div><strong>${state.conversationType === "teacher" ? (state.profile.role === "admin" ? "Student" : "Teacher") : escapeHtml(state.conversationName)}</strong><small>${state.conversationType === "teacher" ? "Request notes or ask a question" : "Private conversation"}</small></div></div><div class="chat-messages">${state.messages.length ? state.messages.map((message) => `<div class="message-bubble ${message.sender_id === state.userId ? "mine" : "theirs"}"><p>${escapeHtml(message.body)}</p><time>${new Date(message.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time></div>`).join("") : `<div class="chat-empty"><span>${icon("MessageCircle", 22)}</span><p>${state.conversationType === "teacher" ? "Ask your teacher for notes or help with a topic." : "Say hello and start the conversation."}</p></div>`}</div><form class="chat-compose" id="message-form"><input name="message" aria-label="Message" placeholder="${state.conversationType === "teacher" ? "Request notes or ask a question..." : "Write a message..."}" autocomplete="off" maxlength="4000" /><button class="button button-dark send-button" aria-label="Send message">${icon("Send", 16)}</button></form>`
    : `<div class="chat-empty choose-chat">${icon("MessageCircle", 24)}<strong>Choose a friend</strong><p>Your accepted friend conversations will appear here.</p></div>`;
  const teacherPanel = state.profile.role === "admin"
    ? `<div class="people-list"><div class="list-label">TEACHER INBOX</div>${teacherRows}</div>`
    : `<div class="people-list"><div class="list-label">TEACHER</div>${teacherRows}</div>`;
  return `${heading}<div class="messages-layout"><section class="people-panel">${teacherPanel}${state.profile.role === "admin" ? "" : `<form class="friend-search" id="friend-search-form"><label for="friend-search">Find a friend</label><div class="input-with-button"><span class="at-symbol">@</span><input id="friend-search" name="username" value="${escapeHtml(state.friendSearch)}" placeholder="username" autocomplete="off" /><button class="icon-button search-submit" aria-label="Search usernames">${icon("Search", 17)}</button></div></form>`}${resultRows ? `<div class="people-list"><div class="list-label">PEOPLE</div>${resultRows}</div>` : ""}<div class="people-list"><div class="list-label">PENDING REQUESTS <span>${incoming.length}</span></div>${requestRows}</div>${state.profile.role === "admin" ? "" : `<div class="people-list"><div class="list-label">YOUR FRIENDS <span>${friends.length}</span></div>${friendRows}${outgoing.length ? `<p class="quiet-empty pending-note">${outgoing.length} request${outgoing.length === 1 ? "" : "s"} waiting for a reply.</p>` : ""}`}</section><section class="chat-panel">${chatContent}</section></div>`;
}

function adminView() {
  const heading = pageHeading("LIBRARY MANAGEMENT", "Admin tools", "Share a resource with students in a few small steps.");
  if (demoMode || !state.profile || state.profile.role !== "admin") {
    const title = demoMode || !state.profile ? "Admin access required" : "This area is for administrators";
    const copy = demoMode ? "Connect Supabase and sign in with an administrator account to manage the library." : !state.profile ? "Sign in with an administrator account in your connected project to manage the library." : "Your account does not have permission to publish or manage resources.";
    return `${heading}<div class="connection-gate"><div class="gate-icon">${icon("ShieldCheck", 24)}</div><h2>${title}</h2><p>${copy}</p>${!demoMode && !state.profile ? `<button class="button button-dark" data-action="auth">Sign in ${icon("ArrowRight", 15)}</button>` : ""}</div>`;
  }
  return `${heading}<div class="admin-layout"><form class="admin-form" id="resource-form"><div class="admin-form-heading"><span class="admin-shield">${icon("ShieldCheck", 18)}</span><div><h2>Add a resource</h2><p>Share a useful class resource with students.</p></div></div><label>Resource title<input name="title" required maxlength="160" placeholder="Give this resource a clear title" /></label><div class="form-grid"><label>Subject<select name="subject_id" required><option value="" disabled selected>Select subject</option>${state.subjects.map((subject) => `<option value="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</option>`).join("")}</select></label><label>Class / grade<input name="class_grade" required maxlength="80" placeholder="e.g. Grade 10" /></label></div><div class="form-grid"><label>Topic<input name="topic" required maxlength="120" placeholder="e.g. Topic name" /></label><label>Resource type<select name="resource_type">${resourceTypes.map(([id, label]) => `<option value="${id}">${label}</option>`).join("")}</select></label></div><label>Short description <span class="optional-label">(optional)</span><textarea name="description" rows="3" maxlength="500" placeholder="A brief note about what students will find."></textarea></label><div class="upload-drop">${icon("FileImage", 19)}<div><strong>Upload a file</strong><small>PDF, image, or document up to 25 MB</small></div><input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx" /></div><div class="or-divider"><span>OR ADD A LINK</span></div><label>External resource URL<input name="external_url" type="url" maxlength="2048" placeholder="https://" /></label><button class="button button-dark publish-button" ${state.busy ? "disabled" : ""}>${state.busy ? "Publishing..." : "Publish resource"}${icon("ArrowRight", 15)}</button></form><aside class="admin-side-note"><div class="admin-side-icon">${icon("Link2", 20)}</div><h3>One shared library</h3><p>Use a clear title and topic so students can find the right resource when they need it.</p><div class="admin-side-rule"></div><div class="admin-side-fact">${icon("Check", 15)}<span>Students can browse resources without signing in</span></div><div class="admin-side-fact">${icon("Check", 15)}<span>Only admins can add or remove resources</span></div><div class="admin-side-fact">${icon("Check", 15)}<span>Uploaded files are stored securely</span></div></aside></div>`;
}

function authModal() {
  const signup = state.authMode === "signup";
  return `<div class="modal-backdrop" data-action="backdrop"><section class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-heading"><button class="icon-button modal-close" data-action="close-modal" aria-label="Close">${icon("X", 19)}</button><span class="auth-mark">${icon("BookOpen", 21)}</span><p class="eyebrow">YOUR STUDY SPACE</p><h2 id="auth-heading">${signup ? "Make room to learn." : "Welcome back."}</h2><p class="auth-caption">${signup ? "Create an account and choose a username friends can find." : "Sign in to pick up where you left off."}</p>${state.modalError ? `<div class="modal-error" role="alert">${escapeHtml(state.modalError)}</div>` : ""}<form class="auth-form" id="auth-form">${signup ? `<label>Username<div class="username-input"><span>@</span><input name="username" required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" title="Use 3-24 letters, numbers, or underscores." placeholder="yourname" autocomplete="username" /></div></label>` : ""}<label>Email<input name="email" type="email" required autocomplete="email" placeholder="you@example.com" /></label><label>Password<input name="password" type="password" required minlength="8" autocomplete="${signup ? "new-password" : "current-password"}" placeholder="At least 8 characters" /></label><button class="button button-dark auth-submit" ${state.busy ? "disabled" : ""}>${state.busy ? "One moment..." : signup ? "Create account" : "Sign in"}${icon("ArrowRight", 15)}</button></form><p class="auth-switch">${signup ? "Already have an account?" : "New to Studyroom?"}<button data-action="toggle-auth">${signup ? "Sign in" : "Create an account"}</button></p></section></div>`;
}

function profileModal() {
  return `<div class="modal-backdrop" data-action="backdrop"><section class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="profile-heading"><button class="icon-button modal-close" data-action="close-modal" aria-label="Close">${icon("X", 19)}</button><span class="auth-mark">${icon("Users", 21)}</span><p class="eyebrow">YOUR ACCOUNT</p><h2 id="profile-heading">Profile</h2><p class="auth-caption">Your username is how friends can find you.</p>${state.modalError ? `<div class="modal-error" role="alert">${escapeHtml(state.modalError)}</div>` : ""}<form class="auth-form" id="profile-form"><label>Username<div class="username-input"><span>@</span><input name="username" required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" value="${escapeHtml(state.profile.username)}" /></div></label><label>Display name <span class="optional-label">(optional)</span><input name="display_name" maxlength="80" value="${escapeHtml(state.profile.display_name ?? "")}" placeholder="What should we call you?" /></label><button class="button button-dark auth-submit">Save profile ${icon("Check", 15)}</button></form><button class="signout-button" data-action="sign-out">${icon("LogOut", 15)}Sign out</button></section></div>`;
}

function render() {
  const viewName = state.view === "exam" ? "Exam prep" : state.view === "admin" ? "Admin tools" : state.view[0].toUpperCase() + state.view.slice(1);
  const nav = navItems.map(([id, label, Icon]) => `<button class="nav-item ${state.view === id ? "active" : ""}" data-view="${id}">${iconName(Icon, 18)}<span>${label}</span>${id === "messages" && state.requests.filter((request) => request.status === "pending" && request.recipient_id === state.userId).length ? `<span class="nav-count">${state.requests.filter((request) => request.status === "pending" && request.recipient_id === state.userId).length}</span>` : ""}</button>`).join("");
  const subjectsNav = state.subjects.map((subject, index) => `<button class="subject-nav-item ${state.selectedSubject === subject.id ? "selected" : ""}" data-subject-nav="${escapeHtml(subject.id)}"><span class="mini-subject-icon ${tints[index]}">${iconName(subjectIcons[index] ?? BookOpen, 15)}</span><span>${escapeHtml(subject.name)}</span></button>`).join("");
  let page = "";
  if (state.view === "overview") {
    page = `<section class="welcome-row"><div><p class="eyebrow">YOUR SPACE TO LEARN</p><h1>${state.profile ? `Good to see you, ${escapeHtml(state.profile.display_name || state.profile.username)}.` : "A little more focused."}</h1><p class="welcome-subtitle">Pick up where you left off, or find a new place to begin.</p></div><div class="welcome-illustration" aria-hidden="true"><div class="sun-disc"></div><div class="book-stack stack-one"></div><div class="book-stack stack-two"></div><div class="plant-stem"><i></i><i></i><i></i></div></div></section><section class="section-block"><div class="section-heading"><div><span class="section-kicker">A GOOD PLACE TO START</span><h2>Your subjects</h2></div><button class="text-button" data-view="subjects">All subjects ${icon("ArrowRight", 15)}</button></div>${subjectGrid(true)}</section><section class="section-block recent-block"><div class="section-heading"><div><span class="section-kicker">FRESHLY ADDED</span><h2>Recent resources</h2></div><button class="text-button" data-view="subjects">Browse library ${icon("ArrowRight", 15)}</button></div>${state.resources.length ? resourceList(state.resources.slice(0, 4)) : emptyState(false)}</section>`;
  } else if (state.view === "subjects" || state.view === "exam") {
    const exam = state.view === "exam";
    const heading = pageHeading(exam ? "FEEL READY, NOT RUSHED" : "THE LIBRARY", exam ? "Exam prep" : "Subjects", exam ? "Practice materials and past papers shared by your school community." : "Notes and learning materials, all in one place.");
    const examIntro = exam ? `<div class="exam-intro"><span class="exam-icon">${icon("Clock3", 22)}</span><div><strong>Build a steady study rhythm</strong><p>Choose a subject and filter for practice sets, past papers, or revision notes.</p></div><button class="button button-dark" data-view="subjects">Explore subjects ${icon("ArrowRight", 15)}</button></div>` : "";
    const subjectChooser = exam ? `<div class="exam-subject-strip"><span class="section-kicker">CHOOSE A SUBJECT</span><div class="subject-chips"><button class="subject-chip ${!state.selectedSubject ? "chip-active" : ""}" data-subject="">All subjects</button>${state.subjects.map((subject) => `<button class="subject-chip ${state.selectedSubject === subject.id ? "chip-active" : ""}" data-subject="${escapeHtml(subject.id)}">${escapeHtml(subject.name)}</button>`).join("")}</div></div>` : subjectGrid();
    const selectedName = state.selectedSubject ? state.subjects.find((item) => item.id === state.selectedSubject)?.name : "ALL SUBJECTS";
    const results = visibleResources().filter((item) => !exam || item.resource_type !== "notes");
    page = `${heading}${examIntro}${subjectChooser}<section class="library-section"><div class="section-heading"><div><span class="section-kicker">${escapeHtml(selectedName ?? "ALL SUBJECTS")}</span><h2>${exam ? "Practice resources" : "Study resources"}</h2></div><span class="result-count">${results.length} ${results.length === 1 ? "resource" : "resources"}</span></div>${filterBar()}${resourceList(results)}</section>`;
  } else if (state.view === "messages") page = messageView();
  else if (state.view === "admin") page = adminView();
  const modal = state.authOpen ? authModal() : state.profileOpen && state.profile ? profileModal() : "";
  app.innerHTML = `<div class="app-shell"><aside class="sidebar ${state.mobileOpen ? "sidebar-open" : ""}"><a class="brand" href="#home" data-view="overview"><span class="brand-mark">${icon("BookOpen", 19)}</span><span>studyroom<span class="brand-dot">.</span><small>YOUR STUDY SPACE</small></span></a><div class="sidebar-section-label">WORKSPACE</div><nav class="side-nav" aria-label="Main navigation">${nav}</nav><div class="sidebar-divider"></div><div class="sidebar-section-row"><span class="sidebar-section-label">YOUR SUBJECTS</span><button class="icon-button tiny" data-view="subjects" aria-label="Browse subjects">${icon("MoreHorizontal", 17)}</button></div><nav class="subject-nav" aria-label="Subjects">${subjectsNav}</nav><div class="sidebar-bottom"><div class="side-note"><div class="side-note-art">${icon("Sparkles", 17)}</div><p>A quiet place to get things done.</p><span>One step at a time.</span></div>${state.profile?.role === "admin" ? `<button class="nav-item admin-link ${state.view === "admin" ? "active" : ""}" data-view="admin">${icon("ShieldCheck", 18)}<span>Admin tools</span></button>` : ""}<button class="profile-row" data-action="profile"><span class="avatar">${state.profile ? escapeHtml(initials(state.profile.display_name || state.profile.username)) : "?"}</span><span class="profile-copy"><strong>${escapeHtml(state.profile?.display_name || state.profile?.username || "Your profile")}</strong><small>${state.profile ? `@${escapeHtml(state.profile.username)}` : "Sign in to connect"}</small></span>${icon("ChevronDown", 15)}</button></div></aside>${state.mobileOpen ? `<button class="mobile-scrim" data-action="close-nav" aria-label="Close navigation"></button>` : ""}<main class="main-shell"><header class="topbar"><button class="icon-button menu-button" data-action="open-nav" aria-label="Open navigation">${icon("Menu", 20)}</button><div class="breadcrumb"><span>Studyroom</span>${icon("ChevronRight", 14)}<strong>${viewName}</strong></div><div class="topbar-actions"><div class="mode-pill"><span class="mode-dot ${demoMode ? "demo" : "connected"}"></span>${demoMode ? "Demo mode" : "Connected"}</div>${state.profile ? `<div class="account-actions"><span class="top-username">@${escapeHtml(state.profile.username)}</span><button class="icon-button" data-action="sign-out" aria-label="Sign out" title="Sign out">${icon("LogOut", 17)}</button></div>` : `<button class="button button-small button-outline" data-action="auth">${icon("LogIn", 15)}Sign in</button>`}</div></header><div class="page-content">${state.notice ? `<div class="notice" role="status"><span>${escapeHtml(state.notice)}</span><button class="icon-button tiny" data-action="clear-notice" aria-label="Dismiss notice">${icon("X", 15)}</button></div>` : ""}${demoMode ? `<div class="demo-banner"><span class="demo-banner-icon">${icon("CircleHelp", 17)}</span><span><strong>Previewing demo mode</strong><small>Connect Supabase to sign in, share resources, and message friends. Browsing works here; no sample study content is included.</small></span><a href="#setup" data-action="setup-notice">Setup guide ${icon("ArrowRight", 14)}</a></div>` : ""}${page}<footer class="page-footer"><span>Studyroom <span class="footer-dot">|</span> A little more focused.</span><span>${demoMode ? "Demo preview" : "Connected to your school"}</span></footer></div></main>${modal}</div>`;
  if (!app.querySelector(".admin-link")) {
    const sidebarBottom = app.querySelector(".sidebar-bottom");
    const profileButton = app.querySelector(".profile-row");
    const adminButton = document.createElement("button");
    adminButton.className = `nav-item admin-link ${state.view === "admin" ? "active" : ""}`;
    adminButton.dataset.view = "admin";
    adminButton.innerHTML = `${icon("ShieldCheck", 18)}<span>Admin tools</span>`;
    sidebarBottom?.insertBefore(adminButton, profileButton);
  }
  if (state.profileMenuOpen && state.profile) {
    const profileButton = app.querySelector(".profile-row");
    profileButton?.setAttribute("aria-haspopup", "menu");
    profileButton?.setAttribute("aria-expanded", "true");
    const profileMenu = document.createElement("div");
    profileMenu.className = "profile-menu";
    profileMenu.setAttribute("role", "menu");
    profileMenu.innerHTML = `<button class="nav-item ${state.view === "messages" ? "active" : ""}" data-action="profile-messages" role="menuitem">${icon("MessageCircle", 17)}<span>Messages</span></button><button class="nav-item" data-action="edit-profile" role="menuitem">${icon("Users", 17)}<span>Edit profile</span></button><button class="nav-item" data-action="sign-out" role="menuitem">${icon("LogOut", 17)}<span>Sign out</span></button>`;
    profileButton?.before(profileMenu);
  } else app.querySelector(".profile-row")?.setAttribute("aria-expanded", "false");
  if (state.conversationId) {
    const messages = app.querySelector(".chat-messages");
    if (messages) messages.scrollTop = messages.scrollHeight;
  }
}

async function loadLibrary() {
  if (!supabase) return;
  const [{ data: subjects, error: subjectError }, { data: resources, error: resourceError }] = await Promise.all([
    supabase.from("subjects").select("id,name,slug,sort_order").order("sort_order"),
    supabase.from("resources").select("*").order("created_at", { ascending: false }),
  ]);
  if (subjectError || resourceError) setNotice(subjectError?.message ?? resourceError?.message ?? "Could not load the library.");
  if (subjects?.length) state.subjects = subjects;
  if (resources) state.resources = resources;
  render();
}

async function loadProfile() {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  state.userId = session?.user.id ?? "";
  if (state.userId) {
    const { data, error } = await supabase.from("profiles").select("id,username,display_name,role").eq("id", state.userId).maybeSingle();
    if (error) setNotice(error.message);
    state.profile = data ?? null;
  } else state.profile = null;
  render();
  if (state.view === "messages" && state.userId) void loadSocial();
}

async function loadSocial() {
  if (!supabase || !state.userId) return;
  const { data, error } = await supabase.from("friend_requests").select("id,requester_id,recipient_id,status,created_at").or(`requester_id.eq.${state.userId},recipient_id.eq.${state.userId}`).order("created_at", { ascending: false });
  if (error) { setNotice(error.message); return; }
  state.requests = data ?? [];
  const ids = [...new Set(state.requests.flatMap((request) => [request.requester_id, request.recipient_id]).filter((id) => id !== state.userId))];
  if (ids.length) {
    const { data: profiles } = await supabase.from("profiles").select("id,username,display_name,role").in("id", ids);
    state.people = profiles ?? [];
  } else state.people = [];
  state.teacherId = "";
  state.teacherConversations = [];
  if (state.profile?.role === "admin") {
    const { data: conversations, error: conversationError } = await supabase.from("conversations")
      .select("id,user_one,user_two,created_at").or(`user_one.eq.${state.userId},user_two.eq.${state.userId}`)
      .order("created_at", { ascending: false });
    if (conversationError) { setNotice(conversationError.message); return; }
    const studentIds = [...new Set((conversations ?? []).map((conversation) => conversation.user_one === state.userId ? conversation.user_two : conversation.user_one))];
    if (studentIds.length) {
      const { data: students, error: studentsError } = await supabase.from("profiles").select("id,username,display_name,role").in("id", studentIds);
      if (studentsError) { setNotice(studentsError.message); return; }
      state.teacherConversations = (conversations ?? []).map((conversation) => ({
        conversation,
        person: students.find((student) => student.id === (conversation.user_one === state.userId ? conversation.user_two : conversation.user_one)),
      })).filter(({ person }) => person && person.role !== "admin");
    }
  } else {
    const { data: teacher, error: teacherError } = await supabase.from("profiles").select("id")
      .eq("role", "admin").order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (teacherError) { setNotice(teacherError.message); return; }
    state.teacherId = teacher?.id ?? "";
  }
  render();
}

let messageChannel;
function stopMessageSubscription() {
  if (messageChannel && supabase) void supabase.removeChannel(messageChannel);
  messageChannel = null;
}

async function showConversation(conversationId, name, type) {
  state.conversationId = conversationId;
  state.conversationName = name;
  state.conversationType = type;
  const result = await supabase.from("messages").select("id,conversation_id,sender_id,body,created_at").eq("conversation_id", conversationId).order("created_at");
  if (result.error) setNotice(result.error.message);
  state.messages = result.data ?? [];
  stopMessageSubscription();
  messageChannel = supabase.channel(`conversation:${conversationId}`).on("postgres_changes", {
    event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}`,
  }, ({ new: record }) => {
    if (!state.messages.some((message) => message.id === record.id)) {
      state.messages.push(record);
      render();
    }
  }).subscribe();
  render();
}

async function openConversation(person) {
  const [user_one, user_two] = [state.userId, person.id].sort();
  let { data, error } = await supabase.from("conversations").select("id").eq("user_one", user_one).eq("user_two", user_two).maybeSingle();
  if (error) { setNotice(error.message); return; }
  if (!data) {
    ({ data, error } = await supabase.from("conversations").insert({ user_one, user_two }).select("id").single());
  }
  if (error || !data) { setNotice(error?.message ?? "Could not open conversation."); return; }
  await showConversation(data.id, person.display_name || person.username, "friend");
}

async function openTeacherConversation(conversationId = "") {
  if (!supabase || !state.userId) return;
  if (state.profile?.role === "admin") {
    const thread = state.teacherConversations.find(({ conversation }) => conversation.id === conversationId);
    if (!thread) return;
    await showConversation(thread.conversation.id, thread.person.display_name || thread.person.username, "teacher");
    return;
  }
  if (!state.teacherId) {
    setNotice("There is no admin account available to receive teacher messages.");
    return;
  }
  const [user_one, user_two] = [state.userId, state.teacherId].sort();
  let { data, error } = await supabase.from("conversations").select("id")
    .eq("user_one", user_one).eq("user_two", user_two).maybeSingle();
  if (error) { setNotice(error.message); return; }
  if (!data) {
    ({ data, error } = await supabase.from("conversations").insert({ user_one, user_two }).select("id").single());
  }
  if (error || !data) { setNotice(error?.message ?? "Could not open the teacher conversation."); return; }
  await showConversation(data.id, "Teacher", "teacher");
}

async function handleAuth(form) {
  const values = new FormData(form);
  state.busy = true;
  state.modalError = "";
  render();
  const email = String(values.get("email") ?? "").trim();
  const password = String(values.get("password") ?? "");
  const username = String(values.get("username") ?? "").trim().toLowerCase();
  const result = state.authMode === "signup"
    ? await supabase.auth.signUp({ email, password, options: { data: { username } } })
    : await supabase.auth.signInWithPassword({ email, password });
  state.busy = false;
  if (result.error) { state.modalError = result.error.message; render(); return; }
  if (state.authMode === "signup" && !result.data.session) {
    state.authOpen = false;
    state.notice = "Check your email to confirm your account, then sign in.";
  } else {
    state.authOpen = false;
    state.notice = state.authMode === "signup" ? "Account created. Welcome to Studyroom." : "Welcome back.";
    await loadProfile();
  }
  render();
}

async function saveProfile(form) {
  const values = new FormData(form);
  const username = String(values.get("username") ?? "").trim().toLowerCase();
  const display_name = String(values.get("display_name") ?? "").trim() || null;
  const { data, error } = await supabase.from("profiles").update({ username, display_name }).eq("id", state.userId).select("id,username,display_name,role").single();
  if (error) { state.modalError = error.message; render(); return; }
  state.profile = data;
  state.profileOpen = false;
  state.notice = "Profile updated.";
  render();
}

async function searchFriends(form) {
  const values = new FormData(form);
  state.friendSearch = String(values.get("username") ?? "").trim();
  if (!state.friendSearch) return;
  const { data, error } = await supabase.from("profiles").select("id,username,display_name,role")
    .ilike("username", state.friendSearch.replace(/^@/, "")).neq("id", state.userId).limit(8);
  if (error) setNotice(error.message);
  else { state.friendResults = data ?? []; render(); }
}

async function sendFriendRequest(personId) {
  const { error } = await supabase.from("friend_requests").insert({ requester_id: state.userId, recipient_id: personId });
  if (error) setNotice(error.message);
  else { state.notice = "Friend request sent."; state.friendResults = []; await loadSocial(); }
}

async function respondToRequest(requestId, accept) {
  const { error } = await supabase.from("friend_requests").update({ status: accept ? "accepted" : "rejected" }).eq("id", requestId);
  if (error) { setNotice(error.message); return; }
  const request = state.requests.find((item) => item.id === requestId);
  state.notice = accept ? "Friend request accepted." : "Request declined.";
  if (accept && request) {
    const [user_one, user_two] = [state.userId, request.requester_id].sort();
    const result = await supabase.from("conversations").upsert({ user_one, user_two }, { onConflict: "user_one,user_two", ignoreDuplicates: true });
    if (result.error) state.notice = result.error.message;
  }
  await loadSocial();
}

async function sendMessage(form) {
  const body = String(new FormData(form).get("message") ?? "").trim();
  if (!body || !state.conversationId) return;
  const { data, error } = await supabase.from("messages").insert({ conversation_id: state.conversationId, sender_id: state.userId, body }).select("id,conversation_id,sender_id,body,created_at").single();
  if (error) setNotice(error.message);
  else {
    if (!state.messages.some((message) => message.id === data.id)) state.messages.push(data);
    render();
  }
}

async function publishResource(form) {
  const values = new FormData(form);
  const file = values.get("file");
  const externalUrl = String(values.get("external_url") ?? "").trim();
  if (!(file instanceof File && file.size > 0) && !externalUrl) { setNotice("Choose a file or add an external URL."); return; }
  if (file instanceof File && file.size > 25 * 1024 * 1024) { setNotice("Files must be 25 MB or smaller."); return; }
  state.busy = true;
  state.notice = "";
  render();
  let filePath = null;
  if (file instanceof File && file.size > 0) {
    filePath = `${state.userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const upload = await supabase.storage.from("study-resources").upload(filePath, file);
    if (upload.error) { state.busy = false; setNotice(upload.error.message); return; }
  }
  const { error } = await supabase.from("resources").insert({
    subject_id: String(values.get("subject_id")), title: String(values.get("title")).trim(),
    class_grade: String(values.get("class_grade")).trim(), topic: String(values.get("topic")).trim(),
    resource_type: String(values.get("resource_type")), description: String(values.get("description") ?? "").trim() || null,
    external_url: externalUrl || null, file_path: filePath,
    file_name: file instanceof File && file.size > 0 ? file.name : null,
    created_by: state.userId,
  });
  state.busy = false;
  if (error) {
    if (filePath) await supabase.storage.from("study-resources").remove([filePath]);
    setNotice(error.message);
    return;
  }
  form.reset();
  state.notice = "Resource published.";
  await loadLibrary();
}

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action], [data-view], [data-subject], [data-subject-nav], [data-person]");
  if (!target) return;
  if (target.dataset.view) { setView(target.dataset.view); return; }
  if (target.dataset.subject !== undefined) {
    state.selectedSubject = state.selectedSubject === target.dataset.subject ? "" : target.dataset.subject;
    if (state.view === "overview") { setView("subjects", true); return; }
    render(); return;
  }
  if (target.dataset.subjectNav) {
    state.selectedSubject = target.dataset.subjectNav;
    setView("subjects", true); return;
  }
  const action = target.dataset.action;
  if (action === "open-nav") { state.mobileOpen = true; render(); }
  if (action === "close-nav") { state.mobileOpen = false; render(); }
  if (action === "auth") openAuth();
  if (action === "profile") {
    if (!state.profile) openAuth();
    else { state.profileMenuOpen = !state.profileMenuOpen; render(); }
  }
  if (action === "profile-messages") setView("messages");
  if (action === "edit-profile") { state.profileMenuOpen = false; state.profileOpen = true; state.modalError = ""; render(); }
  if (action === "sign-out") {
    await supabase.auth.signOut();
    state.profileOpen = false; state.profileMenuOpen = false; state.view = "overview"; state.notice = "Signed out.";
    render();
  }
  if (action === "setup-notice") { event.preventDefault(); setNotice("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local, then restart the app."); }
  if (action === "clear-notice") { state.notice = ""; render(); }
  if (action === "close-modal" || action === "backdrop" && target === event.target) { state.authOpen = false; state.profileOpen = false; render(); }
  if (action === "toggle-auth") { state.authMode = state.authMode === "signup" ? "signin" : "signup"; state.modalError = ""; render(); }
  if (action === "clear-search") { state.search = ""; render(); }
  if (action === "friend-request") { const person = state.friendResults.find((item) => item.id === target.dataset.id); if (person) await sendFriendRequest(person.id); }
  if (action === "accept" || action === "reject") await respondToRequest(target.dataset.id, action === "accept");
  if (action === "open-chat") { const person = state.people.find((item) => item.id === target.dataset.id); if (person) await openConversation(person); }
  if (action === "open-teacher-chat") await openTeacherConversation(target.dataset.id);
  if (action === "close-chat") { state.conversationId = ""; state.conversationType = "friend"; state.messages = []; stopMessageSubscription(); render(); }
  if (target.dataset.person && !target.closest(".person-action")) {
    const person = state.people.find((item) => item.id === target.dataset.person);
    if (person && state.requests.some((request) => request.status === "accepted" && [request.requester_id, request.recipient_id].includes(person.id))) await openConversation(person);
  }
});

app.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "auth-form") await handleAuth(form);
  if (form.id === "profile-form") await saveProfile(form);
  if (form.id === "friend-search-form") await searchFriends(form);
  if (form.id === "message-form") await sendMessage(form);
  if (form.id === "resource-form") await publishResource(form);
});

app.addEventListener("input", (event) => {
  const field = event.target;
  if (field.name === "search") {
    state.search = field.value;
    const cursor = field.selectionStart;
    render();
    const next = app.querySelector('[name="search"]');
    next?.focus();
    next?.setSelectionRange(cursor, cursor);
  }
  if (field.name === "username" && field.id === "friend-search") state.friendSearch = field.value;
});

app.addEventListener("change", (event) => {
  const filter = event.target.dataset.filter;
  if (filter) { state[filter] = event.target.value; render(); }
});

if (supabase) {
  void Promise.all([loadLibrary(), loadProfile()]);
  supabase.auth.onAuthStateChange(() => window.setTimeout(() => {
    void loadProfile();
    if (state.view === "messages") void loadSocial();
  }, 0));
}

render();