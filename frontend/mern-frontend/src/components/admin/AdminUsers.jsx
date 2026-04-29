import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Mail,
  MapPin,
  MoreHorizontal,
  Search,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, formatDate, userAPI } from '@/lib/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import LoadingSpinner from '../LoadingSpinner';

const regions = [
  'All Regions',
  'North America',
  'South America',
  'Europe',
  'Asia',
  'Africa',
  'Australia',
  'Antarctica',
];

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    search: '',
    region: 'All Regions',
    role: 'all',
    page: 1,
    limit: 10,
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users', filters],
    queryFn: async () => {
      const params = {
        ...filters,
        region: filters.region === 'All Regions' ? undefined : filters.region,
        role: filters.role === 'all' ? undefined : filters.role,
      };

      const response = await userAPI.getAllUsers(params);
      return response.data.data;
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['admin-user-analytics', filters.region],
    queryFn: async () => {
      const response = await adminAPI.getUserAnalytics(
        filters.region === 'All Regions' ? undefined : { region: filters.region }
      );
      return response.data.data;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => userAPI.updateUserRole(userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User role updated');
      setIsRoleDialogOpen(false);
    },
    onError: (mutationError) => {
      toast.error(mutationError.response?.data?.message || 'Unable to update user role');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => userAPI.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User removed');
      setIsDeleteDialogOpen(false);
    },
    onError: (mutationError) => {
      toast.error(mutationError.response?.data?.message || 'Unable to delete user');
    },
  });

  const users = data?.users || [];
  const pagination = data?.pagination || {};

  const summary = useMemo(() => {
    return {
      totalUsers: pagination.totalItems || users.length,
      verified: analytics?.verificationStats?.find((item) => item._id === true)?.count || 0,
      admins: users.filter((user) => ['admin', 'superadmin'].includes(user.role)).length,
      latestMonth: analytics?.registrationTrends?.[analytics.registrationTrends.length - 1]?.count || 0,
    };
  }, [analytics, pagination.totalItems, users]);

  const handleFilterChange = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: key === 'page' ? value : 1,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          We couldn’t load users right now. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[36px] bg-[linear-gradient(135deg,#111827_0%,#1f2937_55%,#14b8a6_140%)] p-6 text-white shadow-2xl shadow-emerald-100/30">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/60">User management</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Manage access with confidence</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/75">
          Search users, adjust roles, and keep the account base healthy without leaving the
          admin workspace.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total users</p>
            <p className="mt-2 text-2xl font-semibold">{summary.totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Verified emails</p>
            <p className="mt-2 text-2xl font-semibold">{summary.verified}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Admin accounts</p>
            <p className="mt-2 text-2xl font-semibold">{summary.admins}</p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Latest registrations</p>
            <p className="mt-2 text-2xl font-semibold">{summary.latestMonth}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
        <CardHeader>
          <CardTitle className="text-xl">Find users</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) => handleFilterChange('search', event.target.value)}
              className="rounded-2xl pl-10"
              placeholder="Search by name or email"
            />
          </div>
          <Select value={filters.region} onValueChange={(value) => handleFilterChange('region', value)}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {regions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-white/80 bg-white/85 shadow-xl shadow-orange-100/30">
        <CardHeader>
          <CardTitle className="text-xl">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="space-y-1">
                      <p className="font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {user.region}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={['admin', 'superadmin'].includes(user.role) ? 'default' : 'secondary'}>
                      {['admin', 'superadmin'].includes(user.role) ? (
                        <Shield className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <Users className="mr-1 h-3.5 w-3.5" />
                      )}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isEmailVerified ? 'secondary' : 'destructive'}>
                      {user.isEmailVerified ? (
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <Mail className="mr-1 h-3.5 w-3.5" />
                      )}
                      {user.isEmailVerified ? 'Verified' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(user.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="rounded-2xl">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUser(user);
                            setIsRoleDialogOpen(true);
                          }}
                        >
                          Change role
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.currentPage || filters.page} of {pagination.totalPages || 1}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => handleFilterChange('page', Math.max(filters.page - 1, 1))}
                disabled={!pagination.hasPrevPage}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Change user role</DialogTitle>
            <DialogDescription>
              Update the role for {selectedUser?.firstName} {selectedUser?.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              defaultValue={selectedUser?.role}
              onValueChange={(value) =>
                setSelectedUser((current) => ({ ...current, role: value }))
              }
            >
              <SelectTrigger className="rounded-2xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Superadmin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-2xl"
              disabled={updateRoleMutation.isPending}
              onClick={() =>
                updateRoleMutation.mutate({
                  userId: selectedUser._id,
                  role: selectedUser.role,
                })
              }
            >
              {updateRoleMutation.isPending ? 'Saving...' : 'Save role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This will permanently remove {selectedUser?.firstName} {selectedUser?.lastName}
              if the account has no existing payments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-2xl"
              disabled={deleteUserMutation.isPending}
              onClick={() => deleteUserMutation.mutate(selectedUser._id)}
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
