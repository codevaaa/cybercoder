import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface TrustWorkspaceProps {
  workspacePath: string;
  onTrust: () => void;
  onExit: () => void;
}

export function TrustWorkspace({ workspacePath, onTrust, onExit }: TrustWorkspaceProps) {
  const [items] = useState([
    { label: 'Yes, I trust this folder', value: 'yes' },
    { label: 'No, exit', value: 'no' }
  ]);

  const handleSelect = (item: { value: string }) => {
    if (item.value === 'yes') {
      onTrust();
    } else {
      onExit();
    }
  };

  return (
    <Box flexDirection="column" padding={1} paddingLeft={2}>
      <Text color="yellow" bold>Accessing workspace:</Text>
      <Box marginY={1}>
        <Text bold>{workspacePath}</Text>
      </Box>
      <Box marginBottom={1} flexDirection="column">
        <Text>Quick safety check: Is this a project you created or one you trust? (Like your own code, a well-known open source project, or work from your team). If not, take a moment to review what's in this folder first.</Text>
      </Box>
      <Box marginBottom={1}>
        <Text>CyberCoder will be able to read, edit, and execute files here.</Text>
      </Box>
      <Box marginBottom={1}>
        <Text color="gray">Security guide</Text>
      </Box>
      <SelectInput items={items} onSelect={handleSelect} />
      <Box marginTop={1}>
        <Text color="gray">Enter to confirm • Esc to cancel</Text>
      </Box>
    </Box>
  );
}
