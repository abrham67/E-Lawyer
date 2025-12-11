import React, { useEffect, useState } from "react";
import { ScaleIcon, Briefcase, Star, Clock, CheckIcon, XIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Navbar from "@/components/Navbar";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
 // import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types/database.types";

type Lawyer = {
  _id: string;
  fullName: string;
  specialization?: string;
  experience?: string;
  rating?: number;
  pricing?: number;
  email?: string;
};

const CompareLawyers: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([]);
  const [selectedLawyers, setSelectedLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all lawyers for the select dropdowns
  useEffect(() => {
    const fetchLawyers = async () => {
      try {
        setLoading(true);
  const response = await fetch("/api/lawyers", { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
        if (!response.ok) throw new Error("Failed to fetch lawyers");
        const lawyersData = await response.json();
        setLawyers(lawyersData as Profile[]);
      } catch (error) {
        console.error('Error fetching lawyers:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load lawyers",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchLawyers();
  }, [toast]);

  // Fetch details for selected lawyers
  useEffect(() => {
    if (selectedLawyerIds.length === 0) {
      setSelectedLawyers([]);
      return;
    }
    Promise.all(
      selectedLawyerIds.map((id) =>
        fetch(`/api/lawyers/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then((res) => res.json())
      )
    )
      .then((lawyerDetails) => setSelectedLawyers(lawyerDetails))
      .catch((err) => console.error("Failed to fetch lawyer details:", err));
  }, [selectedLawyerIds]);

  const handleSelect = (id: string) => {
    setSelectedLawyerIds((prev) =>
      prev.includes(id)
        ? prev.filter((lid) => lid !== id)
        : prev.length < 2
        ? [...prev, id]
        : prev
    );
  };

  const handleViewProfile = (id: string) => {
    navigate(`/lawyers/${id}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderComparisonRow = (
    label: string, 
    leftValue: string | number | null | undefined, 
    rightValue: string | number | null | undefined,
    type: 'text' | 'number' | 'boolean' = 'text'
  ) => {
    const renderValue = (value: string | number | null | undefined, type: 'text' | 'number' | 'boolean') => {
      if (value === null || value === undefined) {
        return <span className="text-muted-foreground italic">Not specified</span>;
      }

      switch (type) {
        case 'boolean':
          return value ? 
            <CheckIcon className="w-5 h-5 text-green-500" /> : 
            <XIcon className="w-5 h-5 text-red-500" />;
        case 'number':
          return <span className="font-medium">{value}</span>;
        default:
          return <span>{value}</span>;
      }
    };

    return (
      <div className="grid grid-cols-3 py-3">
        <div className="font-medium">{label}</div>
        <div className="text-center">{renderValue(leftValue, type)}</div>
        <div className="text-center">{renderValue(rightValue, type)}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
  <main id="main-dashboard-section" className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center mb-8">
          <ScaleIcon className="h-12 w-12 text-primary mb-2" />
          <h1 className="text-3xl font-bold text-center">Compare Lawyers</h1>
          <p className="text-muted-foreground text-center mt-2">
            Select two lawyers to compare their qualifications, experience, and rates
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Lawyers to Compare</CardTitle>
            <CardDescription>
              Choose two lawyers from the dropdown menus below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left lawyer selection */}
              <div>
                <label className="block text-sm font-medium mb-2">First Lawyer</label>
                <Select
                  value={selectedLawyers.left || ''}
                  onValueChange={(value) => handleSelect(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lawyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>Loading lawyers...</SelectItem>
                    ) : lawyers.length > 0 ? (
                      lawyers.map((lawyer) => (
                        <SelectItem key={`left-${lawyer.id}`} value={lawyer.id}>
                          {lawyer.full_name || 'Unnamed Lawyer'}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-lawyers" disabled>No lawyers available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Right lawyer selection */}
              <div>
                <label className="block text-sm font-medium mb-2">Second Lawyer</label>
                <Select
                  value={selectedLawyers.right || ''}
                  onValueChange={(value) => handleSelect(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lawyer" />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>Loading lawyers...</SelectItem>
                    ) : lawyers.length > 0 ? (
                      lawyers.map((lawyer) => (
                        <SelectItem key={`right-${lawyer.id}`} value={lawyer.id}>
                          {lawyer.full_name || 'Unnamed Lawyer'}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-lawyers" disabled>No lawyers available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparison results */}
        {(leftLawyer || rightLawyer) && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Comparison Results</CardTitle>
              <CardDescription>
                Side-by-side comparison of selected lawyers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Headers */}
              <div className="grid grid-cols-3 mb-4">
                <div></div>
                <div className="text-center">
                  {leftLawyer ? (
                    <div className="flex flex-col items-center">
                      <Avatar className="h-16 w-16 mb-2">
                        <AvatarImage src={leftLawyer.avatar_url || ''} alt={leftLawyer.full_name || ''} />
                        <AvatarFallback>
                          {leftLawyer.full_name ? getInitials(leftLawyer.full_name) : 'LA'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold">{leftLawyer.full_name}</span>
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => handleViewProfile(leftLawyer.id)}
                      >
                        View Profile
                      </Button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No lawyer selected</div>
                  )}
                </div>
                <div className="text-center">
                  {rightLawyer ? (
                    <div className="flex flex-col items-center">
                      <Avatar className="h-16 w-16 mb-2">
                        <AvatarImage src={rightLawyer.avatar_url || ''} alt={rightLawyer.full_name || ''} />
                        <AvatarFallback>
                          {rightLawyer.full_name ? getInitials(rightLawyer.full_name) : 'LA'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-bold">{rightLawyer.full_name}</span>
                      <Button 
                        variant="link" 
                        size="sm"
                        onClick={() => handleViewProfile(rightLawyer.id)}
                      >
                        View Profile
                      </Button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No lawyer selected</div>
                  )}
                </div>
              </div>

              {/* Comparison rows */}
              <div className="border rounded-md">
                <div className="bg-muted px-4 py-2 font-semibold">Professional Information</div>
                {renderComparisonRow("Specialization", leftLawyer?.specialization, rightLawyer?.specialization)}
                {renderComparisonRow("Years of Experience", leftLawyer?.years_of_experience, rightLawyer?.years_of_experience, 'number')}
                {renderComparisonRow("Bar Number", leftLawyer?.bar_number, rightLawyer?.bar_number)}
                {renderComparisonRow("Hourly Rate", 
                  leftLawyer?.hourly_rate ? `$${leftLawyer.hourly_rate}` : null, 
                  rightLawyer?.hourly_rate ? `$${rightLawyer.hourly_rate}` : null
                )}
                
                <Separator />
                
                <div className="bg-muted px-4 py-2 font-semibold">Contact Information</div>
                {renderComparisonRow("Email", leftLawyer?.email, rightLawyer?.email)}
                {renderComparisonRow("Phone", leftLawyer?.contact_number, rightLawyer?.contact_number)}
                {renderComparisonRow("Office Address", leftLawyer?.office_address, rightLawyer?.office_address)}
                
                <Separator />
                
                <div className="bg-muted px-4 py-2 font-semibold">Languages</div>
                <div className="grid grid-cols-3 py-3">
                    <div className="font-medium">Spoken Languages</div>
                    <div className="text-center">
                      {leftLawyer?.languages && leftLawyer.languages.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-1">
                          {leftLawyer.languages.map((lang, index) => (
                            <Badge key={index} variant="outline" className="bg-blue-50">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Not specified</span>
                      )}
                    </div>
                    <div className="text-center">
                      {rightLawyer?.languages && rightLawyer.languages.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-1">
                          {rightLawyer.languages.map((lang, index) => (
                            <Badge key={index} variant="outline" className="bg-blue-50">
                              {lang}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Not specified</span>
                      )}
                    </div>
                </div>
                
                <Separator />
                
                <div className="bg-muted px-4 py-2 font-semibold">Education</div>
                <div className="grid grid-cols-3 py-3">
                  <div className="font-medium">Education Background</div>
                  <div className="text-center">
                    {leftLawyer?.education && leftLawyer.education.length > 0 ? (
                      <div className="space-y-1">
                        {leftLawyer.education.map((edu, index) => (
                          <div key={index}>{edu}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Not specified</span>
                    )}
                  </div>
                  <div className="text-center">
                    {rightLawyer?.education && rightLawyer.education.length > 0 ? (
                      <div className="space-y-1">
                        {rightLawyer.education.map((edu, index) => (
                          <div key={index}>{edu}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Not specified</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center mt-6 gap-4">
                {leftLawyer && (
                  <Button 
                    onClick={() => handleViewProfile(leftLawyer.id)}
                    className="flex items-center gap-2"
                  >
                    Select {leftLawyer.full_name?.split(' ')[0]}
                  </Button>
                )}
                {rightLawyer && (
                  <Button 
                    onClick={() => handleViewProfile(rightLawyer.id)}
                    className="flex items-center gap-2"
                  >
                    Select {rightLawyer.full_name?.split(' ')[0]}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CompareLawyers;
