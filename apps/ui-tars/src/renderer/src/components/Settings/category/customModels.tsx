/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Check, EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';

import { VLMProviderV2 } from '@main/store/types';
import type { CustomModelConfig } from '@main/store/validate';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@renderer/components/ui/dialog';

const settingApi = window.electron.setting;

function generateId(): string {
  return `model_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface AddModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (model: CustomModelConfig) => void;
  editModel?: CustomModelConfig | null;
}

function AddModelDialog({
  open,
  onOpenChange,
  onSave,
  editModel,
}: AddModelDialogProps) {
  const [name, setName] = useState('');
  const [vlmProvider, setVlmProvider] = useState<VLMProviderV2>(
    VLMProviderV2.openai_compatible,
  );
  const [vlmBaseUrl, setVlmBaseUrl] = useState('');
  const [vlmApiKey, setVlmApiKey] = useState('');
  const [vlmModelName, setVlmModelName] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (editModel) {
      setName(editModel.name);
      setVlmProvider(editModel.vlmProvider || VLMProviderV2.openai_compatible);
      setVlmBaseUrl(editModel.vlmBaseUrl);
      setVlmApiKey(editModel.vlmApiKey);
      setVlmModelName(editModel.vlmModelName);
    } else {
      setName('');
      setVlmProvider(VLMProviderV2.openai_compatible);
      setVlmBaseUrl('');
      setVlmApiKey('');
      setVlmModelName('');
    }
    setShowKey(false);
  }, [editModel, open]);

  const handleSave = () => {
    if (
      !name.trim() ||
      !vlmBaseUrl.trim() ||
      !vlmApiKey.trim() ||
      !vlmModelName.trim()
    ) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      new URL(vlmBaseUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }
    onSave({
      id: editModel?.id || generateId(),
      name: name.trim(),
      vlmProvider,
      vlmBaseUrl: vlmBaseUrl.trim(),
      vlmApiKey: vlmApiKey.trim(),
      vlmModelName: vlmModelName.trim(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {editModel ? 'Edit Model' : 'Add Custom Model'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Preset Name *</Label>
            <Input
              placeholder="e.g. GPT-4o, Claude 3.5, Qwen-VL..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>VLM Provider</Label>
            <Select
              value={vlmProvider}
              onValueChange={(v) => setVlmProvider(v as VLMProviderV2)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(VLMProviderV2).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Base URL *</Label>
            <Input
              placeholder="https://api.openai.com/v1"
              value={vlmBaseUrl}
              onChange={(e) => setVlmBaseUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>API Key *</Label>
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="sk-..."
                value={vlmApiKey}
                onChange={(e) => setVlmApiKey(e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <Eye className="h-4 w-4 text-gray-500" />
                ) : (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Model Name *</Label>
            <Input
              placeholder="gpt-4o, claude-3-5-sonnet, qwen-vl-max..."
              value={vlmModelName}
              onChange={(e) => setVlmModelName(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{editModel ? 'Update' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CustomModelsManager() {
  const [models, setModels] = useState<CustomModelConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editModel, setEditModel] = useState<CustomModelConfig | null>(null);

  const loadModels = useCallback(async () => {
    try {
      const list = await settingApi.getCustomModels();
      setModels(list || []);
    } catch (err) {
      console.error('Failed to load custom models:', err);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const handleSave = async (model: CustomModelConfig) => {
    try {
      if (editModel) {
        const updated = await settingApi.updateCustomModel(model);
        setModels(updated);
        toast.success(`Model "${model.name}" updated`);
      } else {
        const updated = await settingApi.addCustomModel(model);
        setModels(updated);
        toast.success(`Model "${model.name}" saved`);
      }
      setEditModel(null);
    } catch (err) {
      toast.error(
        `Failed to save model: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const updated = await settingApi.deleteCustomModel(id);
      setModels(updated);
      toast.success(`Model "${name}" deleted`);
    } catch (err) {
      toast.error(
        `Failed to delete: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    }
  };

  const handleApply = async (id: string, name: string) => {
    try {
      await settingApi.applyCustomModel(id);
      toast.success(`Switched to "${name}"`, { duration: 1500 });
    } catch (err) {
      toast.error(
        `Failed to apply: ${err instanceof Error ? err.message : 'Unknown'}`,
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Custom Model Presets</h4>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditModel(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Model
        </Button>
      </div>

      {models.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No custom models saved. Click &ldquo;Add Model&rdquo; to add your first
          model preset.
        </p>
      ) : (
        <div className="space-y-2">
          {models.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border p-3 bg-card"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium truncate">{m.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {m.vlmModelName} &middot; {m.vlmBaseUrl}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Apply this model"
                  onClick={() => handleApply(m.id, m.name)}
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Edit"
                  onClick={() => {
                    setEditModel(m);
                    setDialogOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  title="Delete"
                  onClick={() => handleDelete(m.id, m.name)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddModelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        editModel={editModel}
      />
    </div>
  );
}
