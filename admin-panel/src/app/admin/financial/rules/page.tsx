'use client';

import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const GET_SETTLEMENT_RULES = gql`
  query GetSettlementRules($filter: SettlementRuleFilterInput) {
    settlementRules(filter: $filter) {
      id
      entityType
      entityId
      ruleType
      config
      canStackWith
      priority
      isActive
      activatedAt
      activatedBy
      notes
      createdAt
      updatedAt
    }
  }
`;

const CREATE_SETTLEMENT_RULE = gql`
  mutation CreateSettlementRule($input: CreateSettlementRuleInput!) {
    createSettlementRule(input: $input) {
      id
      entityType
      isActive
    }
  }
`;

const ACTIVATE_RULE = gql`
  mutation ActivateSettlementRule($id: ID!) {
    activateSettlementRule(id: $id) {
      id
      isActive
      activatedAt
    }
  }
`;

const DEACTIVATE_RULE = gql`
  mutation DeactivateSettlementRule($id: ID!) {
    deactivateSettlementRule(id: $id) {
      id
      isActive
    }
  }
`;

const DELETE_RULE = gql`
  mutation DeleteSettlementRule($id: ID!) {
    deleteSettlementRule(id: $id)
  }
`;

export default function SettlementRulesPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  const { data, loading, refetch } = useQuery(GET_SETTLEMENT_RULES, {
    variables: {
      filter: {
        entityType: filterType === 'all' ? null : filterType,
        isActive: filterActive,
      },
    },
    fetchPolicy: 'cache-and-network',
  });

  const [createRule] = useMutation(CREATE_SETTLEMENT_RULE, {
    onCompleted: () => {
      toast({ title: 'Rule created successfully' });
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const [activateRule] = useMutation(ACTIVATE_RULE, {
    onCompleted: () => {
      toast({ title: 'Rule activated' });
      refetch();
    },
  });

  const [deactivateRule] = useMutation(DEACTIVATE_RULE, {
    onCompleted: () => {
      toast({ title: 'Rule deactivated' });
      refetch();
    },
  });

  const [deleteRule] = useMutation(DELETE_RULE, {
    onCompleted: () => {
      toast({ title: 'Rule deleted' });
      refetch();
    },
  });

  const rules = data?.settlementRules || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Settlement Rules</CardTitle>
              <CardDescription>Define commission and payment rules for businesses and drivers</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Create Rule</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Settlement Rule</DialogTitle>
                  <DialogDescription>
                    Define a new settlement rule for commission calculations
                  </DialogDescription>
                </DialogHeader>
                <CreateRuleForm onSubmit={(values) => createRule({ variables: { input: values } })} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="BUSINESS">Business</SelectItem>
                <SelectItem value="DRIVER">Driver</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
              onValueChange={(v: string) => setFilterActive(v === 'all' ? null : v === 'active')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Rule Type</TableHead>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No settlement rules found
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <Badge variant="outline">{rule.entityType}</Badge>
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            {rule.entityId.slice(0, 8)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge>{rule.ruleType}</Badge>
                      </TableCell>
                      <TableCell className="max-w-sm">
                        <div className="text-xs font-mono truncate">
                          {JSON.stringify(rule.config)}
                        </div>
                        {rule.notes && (
                          <div className="text-xs text-muted-foreground mt-1">{rule.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{rule.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        {rule.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {rule.isActive ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deactivateRule({ variables: { id: rule.id } })}
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => activateRule({ variables: { id: rule.id } })}
                            >
                              Activate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this rule?')) {
                                deleteRule({ variables: { id: rule.id } });
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateRuleForm({ onSubmit }: { onSubmit: (values: any) => void }) {
  const [entityType, setEntityType] = useState('BUSINESS');
  const [ruleType, setRuleType] = useState('PERCENTAGE');
  const [entityId, setEntityId] = useState('');
  const [priority, setPriority] = useState('100');
  const [notes, setNotes] = useState('');
  const [configJson, setConfigJson] = useState('{\n  "percentage": 15,\n  "description": "Platform commission"\n}');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const config = JSON.parse(configJson);
      onSubmit({
        entityType,
        entityId,
        ruleType,
        config,
        priority: parseInt(priority),
        notes: notes || null,
        canStackWith: [],
      });
    } catch (error) {
      alert('Invalid JSON configuration');
    }
  };

  const ruleTemplates: Record<string, string> = {
    PERCENTAGE: '{\n  "percentage": 15,\n  "description": "15% commission"\n}',
    FIXED_PER_ORDER: '{\n  "fixedAmount": 5.00,\n  "description": "€5 per order"\n}',
    PRODUCT_MARKUP: '{\n  "markupPercentage": 20,\n  "categoryIds": []\n}',
    DRIVER_VEHICLE_BONUS: '{\n  "vehicleType": "MOTORCYCLE",\n  "bonusPerOrder": 2.50\n}',
    CUSTOM: '{\n  "formula": "custom calculation"\n}',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select value={entityType} onValueChange={setEntityType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUSINESS">Business</SelectItem>
              <SelectItem value="DRIVER">Driver</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Rule Type</Label>
          <Select
            value={ruleType}
            onValueChange={(v) => {
              setRuleType(v);
              setConfigJson(ruleTemplates[v] || ruleTemplates.PERCENTAGE);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PERCENTAGE">Percentage</SelectItem>
              <SelectItem value="FIXED_PER_ORDER">Fixed Per Order</SelectItem>
              <SelectItem value="PRODUCT_MARKUP">Product Markup</SelectItem>
              <SelectItem value="DRIVER_VEHICLE_BONUS">Driver Vehicle Bonus</SelectItem>
              <SelectItem value="CUSTOM">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Entity ID</Label>
        <Input
          placeholder="UUID of business or driver"
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Priority</Label>
        <Input
          type="number"
          placeholder="100"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">Higher priority rules execute first</p>
      </div>

      <div className="space-y-2">
        <Label>Configuration (JSON)</Label>
        <Textarea
          placeholder="Rule configuration"
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          className="font-mono text-sm"
          rows={8}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Notes (Optional)</Label>
        <Textarea
          placeholder="Additional notes about this rule..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full">
        Create Rule
      </Button>
    </form>
  );
}
