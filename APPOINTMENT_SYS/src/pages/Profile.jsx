import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import ChangeEmailDialog from '../components/ChangeEmailDialog';
import DangerZoneCard from '../components/profile/DangerZoneCard';
import EmailCard from '../components/profile/EmailCard';
import PersonalInfoCard from '../components/profile/PersonalInfoCard';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileMobile from '../components/profile/ProfileMobile';
import ProfileSideNav from '../components/profile/ProfileSideNav';
import RemindersCard from '../components/profile/RemindersCard';
import SecurityCard from '../components/profile/SecurityCard';
import useAuth from '../hooks/useAuth';
import useIsMobile from '../hooks/useIsMobile';
import useToast from '../hooks/useToast';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const showToast = useToast();
  const isMobile = useIsMobile();
  const [emailDialog, setEmailDialog] = useState(false);
  const isStaff = user.role === 'staff';
  // Admin accounts are protected by 2FA, so their email and password are only
  // changed from the admin panel (the server refuses it here).
  const isAdmin = user.role === 'admin';
  const personalSubtitle = isStaff ? 'Your contact details.' : 'Your name and phone number are shared with staff for your appointments.';

  // Staff don't book appointments and their accounts are managed by an admin,
  // so they get no reminders or danger zone.
  // TODO(backend): "Health info" and "Devices" sections once that data exists.
  const navItems = useMemo(
    () => [
      { id: 'personal-info', label: 'Personal info' },
      { id: 'security', label: 'Security' },
      ...(isStaff ? [] : [{ id: 'reminders', label: 'Reminders' },]),
    ],
    [isStaff],
  );

  const emailDialogEl = (
    <ChangeEmailDialog
      open={emailDialog}
      currentEmail={user.email}
      onClose={() => setEmailDialog(false)}
      onChanged={(updated) => {
        updateUser(updated);
        showToast('Email address updated.');
      }}
    />
  );

  // Phones/tablets: settings-list layout with in-page sub-screens.
  if (isMobile) {
    return (
      <>
        <ProfileMobile
          user={user}
          isStaff={isStaff}
          isAdmin={isAdmin}
          personalSubtitle={personalSubtitle}
          onChangeEmail={() => setEmailDialog(true)}
        />
        {emailDialogEl}
      </>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <ProfileHeader user={user} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: '260px minmax(0, 1fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        <Box sx={{ minWidth: 0, position: { md: 'sticky' }, top: { md: 96 } }}>
          <ProfileSideNav items={navItems} />
        </Box>

        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <PersonalInfoCard subtitle={personalSubtitle} />
          <EmailCard user={user} isStaff={isStaff} isAdmin={isAdmin} onChange={() => setEmailDialog(true)} />
          <SecurityCard isAdmin={isAdmin} />
          {!isStaff && <RemindersCard />}
          {/* {!isStaff && <DangerZoneCard />} */}
        </Stack>
      </Box>

      {emailDialogEl}
    </Container>
  );
}
