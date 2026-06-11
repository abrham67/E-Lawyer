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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [selectedLawyerIds, setSelectedLawyerIds] = useState<string[]>([]);
  const [selectedLawyers, setSelectedLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all lawyers for the select dropdowns
  useEffect(() => {
    const fetchLawyers = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
  const response = await fetch("/api/lawyers", { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!response.ok) throw new Error(t('compare_lawyers.failed_fetch'));
        const lawyersData = await response.json();
        setLawyers(lawyersData as Profile[]);
      } catch (error) {
        console.error('Error fetching lawyers:', error);
        toast({
          variant: "destructive",
          title: t('compare_lawyers.error'),
          description: t('compare_lawyers.failed_load'),
        });
      } finally {
        setLoading(false);
      }
    };
    fetchLawyers();
  }, [toast, t]);

  // Fetch details for selected lawyers
  useEffect(() => {
    if (selectedLawyerIds.length === 0) {
      setSelectedLawyers([]);
      return;
    }
    const token = localStorage.getItem('token');
    Promise.all(
      selectedLawyerIds.map((id) =>
        fetch(`/api/lawyers/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined }).then((res) => res.json())
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
        return <span className="text-muted-foreground italic">{t('compare_lawyers.not_specified')}</span>;
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
          <h1 className="text-3xl font-bold text-center">{t('compare_lawyers.title')}</h1>
          <p className="text-muted-foreground text-center mt-2">
            {t('compare_lawyers.subtitle')}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('compare_lawyers.select_title')}</CardTitle>
            <CardDescription>
              {t('compare_lawyers.choose_two')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left lawyer selection */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('compare_lawyers.first_lawyer')}</label>
                <Select
                  value={selectedLawyers.left || ''}
                  onValueChange={(value) => handleSelect(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('compare_lawyers.select_a_lawyer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>{t('compare_lawyers.loading_lawyers')}</SelectItem>
                    ) : lawyers.length > 0 ? (
                      lawyers.map((lawyer) => (
                        <SelectItem key={`left-${lawyer.id}`} value={lawyer.id}>
                          {lawyer.full_name || t('compare_lawyers.unnamed_lawyer')}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-lawyers" disabled>{t('compare_lawyers.no_lawyers_available')}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Right lawyer selection */}
              <div>
                <label className="block text-sm font-medium mb-2">{t('compare_lawyers.second_lawyer')}</label>
                <Select
                  value={selectedLawyers.right || ''}
                  onValueChange={(value) => handleSelect(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('compare_lawyers.select_a_lawyer')} />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>{t('compare_lawyers.loading_lawyers')}</SelectItem>
                    ) : lawyers.length > 0 ? (
                      lawyers.map((lawyer) => (
                        <SelectItem key={`right-${lawyer.id}`} value={lawyer.id}>
                          {lawyer.full_name || t('compare_lawyers.unnamed_lawyer')}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-lawyers" disabled>{t('compare_lawyers.no_lawyers_available')}</SelectItem>
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
              <CardTitle>{t('compare_lawyers.results_title')}</CardTitle>
              <CardDescription>
                {t('compare_lawyers.results_desc')}
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
                        {t('compare_lawyers.view_profile')}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">{t('compare_lawyers.no_lawyer_selected')}</div>
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
                        {t('compare_lawyers.view_profile')}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">{t('compare_lawyers.no_lawyer_selected')}</div>
                  )}
                </div>
              </div>

              {/* Comparison rows */}
              <div className="border rounded-md">
                <div className="bg-muted px-4 py-2 font-semibold">{t('compare_lawyers.professional_info')}</div>
                {renderComparisonRow(t('compare_lawyers.specialization'), leftLawyer?.specialization, rightLawyer?.specialization)}
                {renderComparisonRow(t('compare_lawyers.years_experience'), leftLawyer?.years_of_experience, rightLawyer?.years_of_experience, 'number')}
                {renderComparisonRow(t('compare_lawyers.bar_number'), leftLawyer?.bar_number, rightLawyer?.bar_number)}
                {renderComparisonRow(t('compare_lawyers.hourly_rate'), 
                  leftLawyer?.hourly_rate ? `$${leftLawyer.hourly_rate}` : null, 
                  rightLawyer?.hourly_rate ? `$${rightLawyer.hourly_rate}` : null
                )}
                
                <Separator />
                
                <div className="bg-muted px-4 py-2 font-semibold">{t('compare_lawyers.contact_information')}</div>
                {renderComparisonRow(t('compare_lawyers.email'), leftLawyer?.email, rightLawyer?.email)}
                {renderComparisonRow(t('compare_lawyers.phone'), leftLawyer?.contact_number, rightLawyer?.contact_number)}
                {renderComparisonRow(t('compare_lawyers.office_address'), leftLawyer?.office_address, rightLawyer?.office_address)}
                
                <Separator />
                
                <div className="bg-muted px-4 py-2 font-semibold">{t('compare_lawyers.languages')}</div>
                <div className="grid grid-cols-3 py-3">
                    <div className="font-medium">{t('compare_lawyers.spoken_languages')}</div>
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
                        <span className="text-muted-foreground italic">{t('compare_lawyers.not_specified')}</span>
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
                        <span className="text-muted-foreground italic">{t('compare_lawyers.not_specified')}</span>
                      )}
                    </div>
                </div>
                
                <Separator />
                
                <div className="bg-muted px-4 py-2 font-semibold">{t('compare_lawyers.education')}</div>
                <div className="grid grid-cols-3 py-3">
                  <div className="font-medium">{t('compare_lawyers.education_background')}</div>
                  <div className="text-center">
                    {leftLawyer?.education && leftLawyer.education.length > 0 ? (
                      <div className="space-y-1">
                        {leftLawyer.education.map((edu, index) => (
                          <div key={index}>{edu}</div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">{t('compare_lawyers.not_specified')}</span>
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
                      <span className="text-muted-foreground italic">{t('compare_lawyers.not_specified')}</span>
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
                    {t('compare_lawyers.select_name', { name: leftLawyer.full_name?.split(' ')[0] })}
                  </Button>
                )}
                {rightLawyer && (
                  <Button 
                    onClick={() => handleViewProfile(rightLawyer.id)}
                    className="flex items-center gap-2"
                  >
                    {t('compare_lawyers.select_name', { name: rightLawyer.full_name?.split(' ')[0] })}
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
