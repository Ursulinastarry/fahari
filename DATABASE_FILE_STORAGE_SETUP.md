# Database File Storage Setup - Complete Guide

## Problem Solved
Files uploaded to your live Railway backend were being saved to the ephemeral file system and getting deleted on container restart. Solution: **Store files directly in the PostgreSQL database**.

## What Was Changed

### 1. **Prisma Schema** (Updated)
- ✅ Added `UserFile` model to store user avatars
- ✅ Added `SalonFile` model to store salon images  
- ✅ Added `ReviewFile` model to store review images
- ✅ Updated User, Salon, Review models with file relationships

### 2. **New Services**
- ✅ Created `server/src/services/fileService.ts`
  - `storeFileInDatabase()` - Save file data to DB
  - `getFileFromDatabase()` - Retrieve file from DB
  - `deleteFileFromDatabase()` - Delete file from DB

### 3. **New Routes**
- ✅ Created `server/src/routes/fileRoutes.ts`
  - `GET /api/files/:fileId` - Stream file from database
  - Includes proper MIME type headers and caching

### 4. **Updated Controllers**
- ✅ `reviewsController.ts` - Now stores review images in database
- ⏳ TODO: Update `salonController.ts` - Store salon images in database
- ⏳ TODO: Update `userController.ts` - Store user avatars in database

## Next Steps to Complete

### Step 1: Run Database Migration
```bash
cd server
npx prisma migrate dev --name add_file_storage
```

### Step 2: Update Salon Controller
Update `server/src/controllers/salonController.ts` to use `storeFileInDatabase()`:

```typescript
import { storeFileInDatabase, deleteFileFromDatabase } from "../services/fileService";

// In createSalon function:
const files = req.files as unknown as { [fieldname: string]: Express.Multer.File[] };

let profileImageId = null;
let coverImageId = null;
let galleryIds: string[] = [];

if (files?.profileImage?.[0]) {
  const stored = await storeFileInDatabase(
    files.profileImage[0].buffer,
    files.profileImage[0].originalname,
    files.profileImage[0].mimetype,
    "salon",
    salonId,
    "profile"
  );
  profileImageId = stored.id;
}

if (files?.coverImage?.[0]) {
  const stored = await storeFileInDatabase(
    files.coverImage[0].buffer,
    files.coverImage[0].originalname,
    files.coverImage[0].mimetype,
    "salon",
    salonId,
    "cover"
  );
  coverImageId = stored.id;
}

// Store in database with IDs instead of filenames
const salon = await prisma.salon.create({
  data: {
    // ... other fields
    profileImage: profileImageId,
    coverImage: coverImageId,
    gallery: galleryIds,
  }
});
```

### Step 3: Update User Controller
Update `server/src/controllers/userController.ts` for avatar uploads:

```typescript
import { storeFileInDatabase } from "../services/fileService";

// In updateUser function:
if (req.file) {
  const stored = await storeFileInDatabase(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype,
    "user",
    userId
  );
  // Update user with file ID
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: stored.id }
  });
}
```

### Step 4: Update Client to Use New File URLs
In client code, update image URLs to use the file API:

```typescript
// Old: buildImageUrl(filename, 'salons') -> /uploads/salons/filename
// New: `/api/files/${fileId}`

// Example in React:
<img src={`${baseUrl}/api/files/${salon.profileImage}`} alt="Profile" />
```

## File URL Format

**Old (File System):**
```
https://backend.com/uploads/salons/profile-123456.png
```

**New (Database):**
```
https://backend.com/api/files/abc-def-ghi-jkl (file ID from database)
```

## Benefits

✅ **Works on Railway** - No file system persistence issues
✅ **Automatic Backup** - Files backed up with your database
✅ **No External Service** - No need for S3 or Cloudinary
✅ **Scalable** - Works across multiple instances
✅ **Secure** - Only authenticated users can access their files

## Database Disk Space Consideration

PostgreSQL has a file size limit and performance consideration:
- Recommended: Image optimization before upload (compress, resize)
- Consider adding image compression middleware on the backend
- Monitor database size growth

## Testing

After migration:
```bash
# Build server
npm run build

# Test file upload
curl -F "reviewImages=@image.png" \
  http://localhost:4000/api/reviews/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test file retrieval
curl http://localhost:4000/api/files/FILE_ID
```
