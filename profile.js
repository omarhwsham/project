// profile.js — Profile Page Logic
import { auth, db, onAuthStateChanged, doc, getDoc, updateDoc, signOut } from './firebase.js';

// ===== DOM Elements =====
const loadingOverlay = document.getElementById('profileLoading');
const headerName = document.getElementById('headerName');
const headerEmail = document.getElementById('headerEmail');
const avatarDisplay = document.getElementById('avatarDisplay');
const avatarInput = document.getElementById('avatarInput');

const nameInput = document.getElementById('pfName');
const emailDisplay = document.getElementById('pfEmail');
const universityInput = document.getElementById('pfUniversity');
const interestSelect = document.getElementById('pfInterest');
const photoUrlInput = document.getElementById('pfPhotoUrl');

const saveBtn = document.getElementById('saveBtn');
const logoutBtn = document.getElementById('logoutBtn');
const toast = document.getElementById('pfToast');

let currentUid = null;
let originalData = {};

// ===== Auth State Listener =====
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        // Not logged in — redirect to main page
        window.location.href = 'index.html';
        return;
    }

    currentUid = user.uid;

    // Load profile from Firestore
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        let profileData;

        if (snap.exists()) {
            profileData = snap.data();
        } else {
            // First time — create profile from auth data
            profileData = {
                name: user.displayName || '',
                email: user.email || '',
                photoURL: user.photoURL || '',
                university: '',
                interest: '',
                createdAt: new Date().toISOString()
            };
            // Don't block UI — save in background
            updateDoc(doc(db, "users", user.uid), profileData).catch(() => {
                // If doc doesn't exist, use setDoc
                import('./firebase.js').then(mod => mod.setDoc(doc(db, "users", user.uid), profileData));
            });
        }

        // Populate UI
        populateProfile(profileData, user);
    } catch (err) {
        console.error('Error loading profile:', err);
        showToast('حدث خطأ في تحميل البيانات', 'error');
    }

    // Hide loading
    loadingOverlay.classList.add('hidden');
});

// ===== Populate Profile =====
function populateProfile(data, user) {
    const name = data.name || user.displayName || '';
    const email = data.email || user.email || '';
    const photoURL = data.photoURL || user.photoURL || '';

    // Header
    headerName.textContent = name || 'مستخدم جديد';
    headerEmail.textContent = email;

    // Avatar
    setAvatar(photoURL, name);

    // Form fields
    nameInput.value = name;
    emailDisplay.value = email;
    universityInput.value = data.university || '';
    interestSelect.value = data.interest || '';
    photoUrlInput.value = photoURL;

    // Store original for comparison
    originalData = { name, university: data.university || '', interest: data.interest || '', photoURL };
}

function setAvatar(url, name) {
    if (url) {
        avatarDisplay.innerHTML = `<img src="${url}" alt="Profile">`;
    } else {
        avatarDisplay.innerHTML = '';
        avatarDisplay.textContent = (name || 'U').charAt(0).toUpperCase();
    }
}

// ===== Avatar Upload Preview =====
avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showToast('الملف لازم يكون صورة', 'error');
        return;
    }
    if (file.size > 2 * 1024 * 1024) {
        showToast('حجم الصورة لازم يكون أقل من 2MB', 'error');
        return;
    }

    // Preview locally
    const reader = new FileReader();
    reader.onload = (ev) => {
        avatarDisplay.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
        // Store as base64 data URL for now
        photoUrlInput.value = ev.target.result;
    };
    reader.readAsDataURL(file);
});

// ===== Save Profile =====
saveBtn.addEventListener('click', async () => {
    // Validate
    const name = nameInput.value.trim();
    const university = universityInput.value.trim();
    const interest = interestSelect.value;
    const photoURL = photoUrlInput.value.trim();

    // Clear previous errors
    document.querySelectorAll('.pf-field').forEach(f => f.classList.remove('invalid'));

    let hasError = false;

    if (!name) {
        document.getElementById('nameField').classList.add('invalid');
        hasError = true;
    }

    if (hasError) return;

    // Check if anything changed
    if (name === originalData.name && university === originalData.university && interest === originalData.interest && photoURL === originalData.photoURL) {
        showToast('مفيش تغييرات جديدة', 'error');
        return;
    }

    // Save
    saveBtn.disabled = true;
    saveBtn.classList.add('saving');
    saveBtn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.7s linear infinite;"></span> جاري الحفظ...';

    try {
        await updateDoc(doc(db, "users", currentUid), {
            name,
            university,
            interest,
            photoURL,
            updatedAt: new Date().toISOString()
        });

        // Update header
        headerName.textContent = name;
        setAvatar(photoURL, name);

        // Update original
        originalData = { name, university, interest, photoURL };

        showToast('تم حفظ التغييرات بنجاح ✓', 'success');
    } catch (err) {
        console.error('Save error:', err);
        showToast('حدث خطأ في الحفظ، حاول تاني', 'error');
    }

    saveBtn.disabled = false;
    saveBtn.classList.remove('saving');
    saveBtn.innerHTML = '<i class="fa fa-check"></i> حفظ التغييرات';
});

// ===== Logout =====
logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
});

// ===== Toast =====
function showToast(msg, type = 'success') {
    toast.textContent = msg;
    toast.className = 'pf-toast ' + type + ' show';
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Live Validation =====
nameInput.addEventListener('input', () => {
    document.getElementById('nameField').classList.remove('invalid');
});
