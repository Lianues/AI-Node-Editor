
import React from 'react';
import { SidebarItemType, SidebarItemId } from '../types'; // Path to types.ts is now ../types
import { FolderIcon } from './icons/FolderIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { CubeTransparentIcon } from './icons/CubeTransparentIcon';
import { PuzzlePieceIcon } from './icons/PuzzlePieceIcon'; 
import { CodeBracketIcon } from './icons/CodeBracketIcon'; // New Icon for Program Interface
import { AdjustmentsHorizontalIcon } from './icons/AdjustmentsHorizontalIcon';

export const SIDEBAR_ITEMS: SidebarItemType[] = [
  { id: SidebarItemId.ProjectFiles, label: '项目文件', icon: FolderIcon },
  { id: SidebarItemId.NodeList, label: '节点列表', icon: ListBulletIcon },
  { id: SidebarItemId.NodeGroupLibrary, label: '节点组库', icon: CubeTransparentIcon },
  { id: SidebarItemId.SubWorkflowLibrary, label: '子程序库', icon: PuzzlePieceIcon }, 
  { id: SidebarItemId.ProgramInterface, label: '程序接口', icon: CodeBracketIcon }, // New Item
  { id: SidebarItemId.PropertyInspector, label: '属性页面', icon: AdjustmentsHorizontalIcon },
];
