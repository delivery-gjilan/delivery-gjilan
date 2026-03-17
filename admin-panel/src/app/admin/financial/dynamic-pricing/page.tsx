'use client';

import { useState, useMemo } from 'react';
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

const GET_DYNAMIC_PRICING_RULES = gql`
  query GetDynamicPricingRules($businessId: ID) {
    dynamicPricingRules(businessId: $businessId) {
      id
      businessId
      name
      description
      conditionType
      conditionConfig
      adjustmentConfig
      appliesTo {
        categoryIds
        productIds
        allProducts
      }
      priority
      isActive
      validFrom
      validUntil
      createdAt
      updatedAt
    }
  }
`;

const CREATE_DYNAMIC_PRICING_RULE = gql`
  mutation CreateDynamicPricingRule($input: CreateDynamicPricingRuleInput!) {
    createDynamicPricingRule(input: $input) {
      id
      name
      isActive
    }
  }
`;

const GET_BUSINESSES = gql`
  query GetBusinesses {
    businesses {
      id
      name
    }
  }
`;

const GET_PRODUCTS_AND_CATEGORIES = gql`
  query ProductsAndCategories($businessId: ID!) {
    productCategories(businessId: $businessId) {
      id
      name
    }
    products(businessId: $businessId) {
      id
      name
      basePrice
      product {
        id
        name
      }
    }
  }
`;

const UPDATE_DYNAMIC_PRICING_RULE = gql`
  mutation UpdateDynamicPricingRule($id: ID!, $input: UpdateDynamicPricingRuleInput!) {
    updateDynamicPricingRule(id: $id, input: $input) {
      id
      isActive
    }
  }
`;

const DELETE_DYNAMIC_PRICING_RULE = gql`
  mutation DeleteDynamicPricingRule($id: ID!) {
    deleteDynamicPricingRule(id: $id)
  }
`;

export default function DynamicPricingPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterBusinessId, setFilterBusinessId] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(GET_DYNAMIC_PRICING_RULES, {
    variables: { businessId: filterBusinessId },
    fetchPolicy: 'cache-and-network',
  });

  const [createRule] = useMutation(CREATE_DYNAMIC_PRICING_RULE, {
    onCompleted: () => {
      toast({ title: 'Dynamic pricing rule created' });
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const [updateRule] = useMutation(UPDATE_DYNAMIC_PRICING_RULE, {
    onCompleted: () => {
      toast({ title: 'Rule updated' });
      refetch();
    },
  });

  const [deleteRule] = useMutation(DELETE_DYNAMIC_PRICING_RULE, {
    onCompleted: () => {
      toast({ title: 'Rule deleted' });
      refetch();
    },
  });

  const rules = data?.dynamicPricingRules || [];

  const toggleRuleStatus = (rule: any) => {
    updateRule({
      variables: {
        id: rule.id,
        input: { isActive: !rule.isActive },
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dynamic Pricing Rules</CardTitle>
              <CardDescription>
                Apply conditional price adjustments based on time, weather, demand, etc.
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Create Rule</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Dynamic Pricing Rule</DialogTitle>
                  <DialogDescription>
                    Define conditional pricing adjustments for specific products or categories
                  </DialogDescription>
                </DialogHeader>
                <CreateDynamicRuleForm onSubmit={(values) => createRule({ variables: { input: values } })} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
          </div>

          {/* Rules Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Adjustment</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No dynamic pricing rules found
                    </TableCell>
                  </TableRow>
                ) : (
                  rules.map((rule: any) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{rule.name}</div>
                          {rule.description && (
                            <div className="text-xs text-muted-foreground">{rule.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{rule.conditionType}</Badge>
                        <div className="text-xs font-mono mt-1 max-w-xs truncate">
                          {JSON.stringify(rule.conditionConfig)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-mono">
                          {JSON.stringify(rule.adjustmentConfig)}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {rule.appliesTo.allProducts ? (
                          <Badge>All Products</Badge>
                        ) : (
                          <div className="space-y-1">
                            {rule.appliesTo.categoryIds?.length > 0 && (
                              <div>Categories: {rule.appliesTo.categoryIds.length}</div>
                            )}
                            {rule.appliesTo.productIds?.length > 0 && (
                              <div>Products: {rule.appliesTo.productIds.length}</div>
                            )}
                          </div>
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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleRuleStatus(rule)}
                          >
                            {rule.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('Delete this rule?')) {
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

function CreateDynamicRuleForm({ onSubmit }: { onSubmit: (values: any) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [conditionType, setConditionType] = useState('TIME_OF_DAY');
  const [priority, setPriority] = useState('100');
  const [allProducts, setAllProducts] = useState(true);
  const [businessScope, setBusinessScope] = useState<'ALL' | 'SPECIFIC'>('ALL');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  
  // Time of Day specific
  const [startHour, setStartHour] = useState('0');
  const [endHour, setEndHour] = useState('6');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([0,1,2,3,4,5,6]);
  
  // Day of Week specific
  const [selectedDays, setSelectedDays] = useState<number[]>([6, 0]); // Weekend
  
  // Weather specific
  const [weatherConditions, setWeatherConditions] = useState<string[]>(['rain']);
  const [minIntensity, setMinIntensity] = useState('moderate');
  
  // Demand specific
  const [demandThreshold, setDemandThreshold] = useState('0.7');
  
  // Adjustment config
  const [adjustmentType, setAdjustmentType] = useState('PERCENTAGE');
  const [adjustmentValue, setAdjustmentValue] = useState('20');
  const [usePerProductOverrides, setUsePerProductOverrides] = useState(false);
  const [overrides, setOverrides] = useState<Array<{ productId: string | null; amount: string }>>([]);

  const { data: businessesData } = useQuery(GET_BUSINESSES);
  const businesses = businessesData?.businesses || [];

  const { data: productsData } = useQuery(GET_PRODUCTS_AND_CATEGORIES, {
    variables: { businessId: selectedBusinessId },
    skip: !selectedBusinessId,
    fetchPolicy: 'cache-first',
  });
  const productsForBusiness = productsData?.products || [];

  const dayOptions = [
    { label: 'Monday', value: 1 },
    { label: 'Tuesday', value: 2 },
    { label: 'Wednesday', value: 3 },
    { label: 'Thursday', value: 4 },
    { label: 'Friday', value: 5 },
    { label: 'Saturday', value: 6 },
    { label: 'Sunday', value: 0 },
  ];

  const weatherOptions = ['clear', 'rain', 'snow', 'fog', 'storm'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let conditionConfig: any = {};
    
    switch (conditionType) {
      case 'TIME_OF_DAY':
        conditionConfig = {
          startHour: parseInt(startHour),
          endHour: parseInt(endHour),
          daysOfWeek,
        };
        break;
      case 'DAY_OF_WEEK':
        conditionConfig = {
          days: selectedDays,
          description: selectedDays.includes(6) && selectedDays.includes(0) ? 'Weekends' : 'Custom days'
        };
        break;
      case 'WEATHER':
        conditionConfig = {
          conditions: weatherConditions,
          minIntensity,
        };
        break;
      case 'DEMAND':
        conditionConfig = {
          threshold: parseFloat(demandThreshold),
          algorithm: 'surge',
        };
        break;
    }

    let adjustmentConfig: any = {
      type: adjustmentType,
    };

    if (adjustmentType === 'FIXED_AMOUNT') {
      if (usePerProductOverrides && overrides.length > 0) {
        adjustmentConfig.overrides = overrides.map(o => ({ productId: o.productId, amount: parseFloat(o.amount) }));
      } else {
        adjustmentConfig.value = parseFloat(adjustmentValue);
      }
    } else {
      adjustmentConfig.value = parseFloat(adjustmentValue);
    }

    const appliesTo: any = {
      allProducts,
      categoryIds: [],
      productIds: [],
    };

    if (usePerProductOverrides && overrides.length > 0) {
      appliesTo.productIds = overrides.map(o => o.productId).filter(Boolean);
    }

    onSubmit({
      businessId: businessScope === 'SPECIFIC' ? selectedBusinessId : null,
      name,
      description: description || null,
      conditionType,
      conditionConfig,
      adjustmentConfig,
      appliesTo,
      priority: parseInt(priority),
    });
  };

  const toggleDay = (day: number) => {
    if (conditionType === 'TIME_OF_DAY') {
      setDaysOfWeek(prev => 
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
      );
    } else {
      setSelectedDays(prev => 
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
      );
    }
  };

  const toggleWeatherCondition = (condition: string) => {
    setWeatherConditions(prev =>
      prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Rule Name</Label>
          <Input
            placeholder="Night Hours Surcharge"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          <p className="text-xs text-muted-foreground">Lower = higher priority</p>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Business Scope</h3>
        <div className="space-y-2">
          <Label>Apply rule to</Label>
          <Select value={businessScope} onValueChange={(v: any) => setBusinessScope(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All businesses (global)</SelectItem>
              <SelectItem value="SPECIFIC">Specific business</SelectItem>
            </SelectContent>
          </Select>
          {businessScope === 'SPECIFIC' && (
            <div className="mt-2">
              <Label>Business</Label>
              <Select value={selectedBusinessId || ''} onValueChange={(v: any) => setSelectedBusinessId(v || null)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businesses.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Use a specific business when you want per-business product prices. For global percentage adjustments choose "All businesses".
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description (Optional)</Label>
        <Input
          placeholder="Apply 20% surcharge during night hours"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Condition</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Condition Type</Label>
            <Select value={conditionType} onValueChange={setConditionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TIME_OF_DAY">Time of Day</SelectItem>
                <SelectItem value="DAY_OF_WEEK">Day of Week</SelectItem>
                <SelectItem value="WEATHER">Weather</SelectItem>
                <SelectItem value="DEMAND">Demand/Surge</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {conditionType === 'TIME_OF_DAY' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Hour (0-23)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Hour (0-23)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Active Days</Label>
                <div className="flex flex-wrap gap-2">
                  {dayOptions.map(day => (
                    <Button
                      key={day.value}
                      type="button"
                      variant={daysOfWeek.includes(day.value) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleDay(day.value)}
                    >
                      {day.label.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {conditionType === 'DAY_OF_WEEK' && (
            <div className="space-y-2">
              <Label>Select Days</Label>
              <div className="flex flex-wrap gap-2">
                {dayOptions.map(day => (
                  <Button
                    key={day.value}
                    type="button"
                    variant={selectedDays.includes(day.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleDay(day.value)}
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {conditionType === 'WEATHER' && (
            <>
              <div className="space-y-2">
                <Label>Weather Conditions</Label>
                <div className="flex flex-wrap gap-2">
                  {weatherOptions.map(condition => (
                    <Button
                      key={condition}
                      type="button"
                      variant={weatherConditions.includes(condition) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleWeatherCondition(condition)}
                    >
                      {condition.charAt(0).toUpperCase() + condition.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Minimum Intensity</Label>
                <Select value={minIntensity} onValueChange={setMinIntensity}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="heavy">Heavy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {conditionType === 'DEMAND' && (
            <div className="space-y-2">
              <Label>Demand Threshold (0-1)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={demandThreshold}
                onChange={(e) => setDemandThreshold(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                0.7 = activates when demand reaches 70% of capacity
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Price Adjustment</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Adjustment Type</Label>
            <Select value={adjustmentType} onValueChange={setAdjustmentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                <SelectItem value="FIXED_AMOUNT">Fixed Amount (€)</SelectItem>
                <SelectItem value="MULTIPLIER">Multiplier (x)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>
              Value {adjustmentType === 'PERCENTAGE' && '(%)'} 
              {adjustmentType === 'FIXED_AMOUNT' && '(€)'}
              {adjustmentType === 'MULTIPLIER' && '(x)'}
            </Label>
            <Input
              type="number"
              step={adjustmentType === 'MULTIPLIER' ? '0.1' : '1'}
              value={adjustmentValue}
              onChange={(e) => setAdjustmentValue(e.target.value)}
              required
            />
          </div>
        </div>
        {adjustmentType === 'PERCENTAGE' && (
          <p className="text-xs text-muted-foreground mt-2">
            Example: 20% on €10 = €12
          </p>
        )}
        {adjustmentType === 'FIXED_AMOUNT' && (
          <p className="text-xs text-muted-foreground mt-2">
            Example: +€2 on €10 = €12
          </p>
        )}
        {adjustmentType === 'MULTIPLIER' && (
          <p className="text-xs text-muted-foreground mt-2">
            Example: 1.5x on €10 = €15
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="all-products"
            checked={allProducts}
            onCheckedChange={setAllProducts}
          />
          <Label htmlFor="all-products" className="font-semibold">Apply to all products</Label>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {allProducts ? 'This rule will apply to all products' : 'Select specific products or categories'}
        </p>
        {!allProducts && adjustmentType === 'FIXED_AMOUNT' && businessScope === 'SPECIFIC' && (
          <div className="mt-3 border rounded p-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Per-product fixed price overrides (for selected business)</h4>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Use overrides</Label>
                <Switch checked={usePerProductOverrides} onCheckedChange={setUsePerProductOverrides} />
              </div>
            </div>

            {usePerProductOverrides && (
              <div className="space-y-2 mt-3">
                {overrides.map((o, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <Label>Product</Label>
                      <Select value={o.productId || ''} onValueChange={(v: any) => {
                        const next = [...overrides]; next[idx].productId = v || null; setOverrides(next);
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {productsForBusiness.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fixed price (€)</Label>
                      <Input type="number" value={o.amount} onChange={(e) => { const next = [...overrides]; next[idx].amount = e.target.value; setOverrides(next); }} />
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => setOverrides(prev => prev.filter((_, i) => i !== idx))}>Remove</Button>
                    </div>
                  </div>
                ))}

                <Button type="button" onClick={() => setOverrides(prev => [...prev, { productId: null, amount: '0' }])}>Add override</Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg">
        Create Rule
      </Button>
    </form>
  );
}
